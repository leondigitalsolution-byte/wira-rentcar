import jsPDF from "jspdf";
import { Booking, Car, AppSettings, Transaction, Partner, Driver, BookingStatus, Customer } from "../types";
import { getStoredData, DEFAULT_SETTINGS } from "./dataService";
// Added missing import for auth service to resolve currentUser reference
import { getCurrentUser } from "./authService";

// --- HELPER: TERBILANG (Number to Words Indonesia) ---
const terbilangInner = (n: number): string => {
    if (n < 0) return "Minus " + terbilangInner(-n);
    const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (n < 12) return words[n];
    if (n < 20) return words[n - 10] + " Belas";
    if (n < 100) {
        const primary = Math.floor(n / 10);
        const secondary = n % 10;
        return words[primary] + " Puluh " + words[secondary];
    }
    if (n < 200) return "Seratus " + terbilangInner(n - 100);
    if (n < 1000) return words[Math.floor(n / 100)] + " Ratus " + terbilangInner(n % 100);
    if (n < 2000) return "Seribu " + terbilangInner(n - 1000);
    if (n < 1000000) return terbilangInner(Math.floor(n / 1000)) + " Ribu " + terbilangInner(n % 1000);
    if (n < 1000000000) return terbilangInner(Math.floor(n / 1000000)) + " Juta " + terbilangInner(n % 1000000);
    if (n < 1000000000000) return terbilangInner(Math.floor(n / 1000000000)) + " Miliar " + terbilangInner(n % 1000000000);
    return "";
};

const terbilang = (n: number): string => {
    if (n === 0) return "Nol Rupiah";
    const result = terbilangInner(Math.floor(n)).replace(/\s+/g, ' ').trim();
    return (result + " Rupiah").toUpperCase();
};

// --- HELPER: PRINT METADATA FOOTER ---
const drawFooterMetadata = (doc: jsPDF, user: any) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const now = new Date().toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const footerText = `Printed on ${now} by ${user?.name || 'System'}`;
    
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        const pageHeight = doc.internal.pageSize.getHeight();
        // Draw at left margin (15mm for portrait, 12mm for collective landscape)
        const xPos = doc.internal.pageSize.getWidth() > 210 ? 12 : 15;
        doc.text(footerText, xPos, pageHeight - 5);
    }
};

// --- REUSABLE COMPONENTS ---

const drawProfessionalHeader = (doc: jsPDF, settings: AppSettings, title: string, subTitle1?: string, subTitle2?: string) => {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const startY = 15;
    
    // Layout Dimensions
    const boxW = 60;
    const boxH = 10;
    const boxX = pageWidth - margin - boxW;
    
    const logoSize = 22;
    const textLeftMargin = margin + logoSize + 5;
    const maxTextWidth = boxX - textLeftMargin - 5; 

    // 1. Draw Logo
    if (settings.logoUrl) {
        try { doc.addImage(settings.logoUrl, 'PNG', margin, startY, logoSize, logoSize); } 
        catch (e) { drawLogoFallback(doc, margin, startY, 0.35); }
    } else {
        drawLogoFallback(doc, margin, startY, 0.35);
    }

    // 2. Company Info (Left Side)
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(settings.companyName.toUpperCase(), textLeftMargin, startY + 6);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(settings.tagline.toUpperCase(), textLeftMargin, startY + 11);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const addressLines = doc.splitTextToSize(settings.address, maxTextWidth);
    doc.text(addressLines, textLeftMargin, startY + 16);
    
    const addressBlockHeight = addressLines.length * 4;
    doc.text(`${settings.phone} | ${settings.email}`, textLeftMargin, startY + 16 + addressBlockHeight);

    const leftContentBottom = startY + 16 + addressBlockHeight + 5;

    // 3. Right Side Box
    doc.setFillColor(252, 220, 220); 
    doc.rect(boxX, startY, boxW, boxH, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, boxX + (boxW / 2), startY + 7, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    let rightContentBottom = startY + boxH;
    if (subTitle1) {
        doc.text(subTitle1, boxX, startY + boxH + 6);
        rightContentBottom += 6;
    }
    if (subTitle2) {
        doc.text(subTitle2, boxX, startY + boxH + 11);
        rightContentBottom += 5;
    }

    const lineY = Math.max(leftContentBottom, rightContentBottom, startY + 30);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    return lineY + 10;
};

const drawLogoFallback = (doc: jsPDF, x: number, y: number, scale: number = 1.0) => {
    const s = (val: number) => val * scale;
    try {
        doc.setFillColor(0, 0, 0); 
        doc.path([
            { op: 'm', c: [s(x + 5), s(y + 5)] },
            { op: 'l', c: [s(x + 35), s(y + 5)] },
            { op: 'c', c: [s(x + 50), s(y + 5), s(x + 50), s(y + 22), s(x + 35), s(y + 22)] },
            { op: 'c', c: [s(x + 50), s(y + 22), s(x + 50), s(y + 38), s(x + 35), s(y + 38)] },
            { op: 'l', c: [s(x + 15), s(y + 38)] },
            { op: 'l', c: [s(x + 15), s(y + 50)] },
            { op: 'l', c: [s(x + 5), s(y + 50)] },
            { op: 'l', c: [s(x + 5), s(y + 5)] },
            { op: 'h' }
        ]);
        doc.fill();
        doc.setFillColor(220, 38, 38); 
        doc.circle(s(x + 50), s(y + 27.5), s(15), 'F');
    } catch (e) {}
};

// --- MAIN PDF EXPORTS ---

export const generateInvoicePDF = (booking: Booking, car: Car) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const user = getCurrentUser();
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const displayCarName = car?.name || booking.externalCarName || 'Unknown Car';
    const displayCarPlate = car?.plate || booking.externalCarPlate || '-';

    let currentY = drawProfessionalHeader(
        doc, 
        settings, 
        "INVOICE", 
        `Nomor    : #${booking.id.slice(0, 8)}`, 
        `Tanggal  : ${new Date(booking.createdAt).toLocaleDateString('id-ID')}`
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("KEPADA YTH (PENYEWA):", margin, currentY);
    doc.text("DETAIL KENDARAAN:", pageWidth / 2 + 10, currentY);
    
    currentY += 8;
    doc.setFont("helvetica", "normal");
    
    const labelW = 35;
    const valueX = margin + labelW;
    const rightX = pageWidth / 2 + 10;
    const rLabelW = 25;

    doc.text("NAMA PENYEWA", margin, currentY);
    doc.text(`: ${booking.customerName}`, valueX, currentY);
    doc.text("Unit", rightX, currentY);
    doc.text(`: ${displayCarName}`, rightX + rLabelW, currentY);
    currentY += 6;

    doc.text("No. WA / HP", margin, currentY);
    doc.text(`: ${booking.customerPhone}`, valueX, currentY);
    doc.text("Nopol", rightX, currentY);
    doc.text(`: ${displayCarPlate}`, rightX + rLabelW, currentY);
    currentY += 6;

    doc.text("Alamat", margin, currentY);
    const addrLines = doc.splitTextToSize(booking.notes || '-', pageWidth / 2 - margin - labelW);
    doc.text(`: ${addrLines[0]}`, valueX, currentY);
    doc.text("Paket", rightX, currentY);
    doc.text(`: ${booking.packageType}`, rightX + rLabelW, currentY);
    currentY += 6;

    doc.text("Tgl. Ambil", margin, currentY);
    doc.text(`: ${new Date(booking.startDate).toLocaleString('id-ID')}`, valueX, currentY);
    currentY += 6;

    doc.text("Tgl. Kembali", margin, currentY);
    doc.text(`: ${new Date(booking.endDate).toLocaleString('id-ID')}`, valueX, currentY);
    currentY += 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RINCIAN BIAYA", margin, currentY);
    currentY += 4;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'S');
    
    doc.setFontSize(9);
    doc.text("Deskripsi", margin + 3, currentY + 5.5);
    doc.text("DETAIL", 85, currentY + 5.5);
    doc.text("JUMLAH (Rp)", pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
    currentY += 8;

    const addTableRow = (desc: string, detail: string, amount: number, isNegative = false) => {
        doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'S');
        doc.setFont("helvetica", "normal");
        doc.text(desc, margin + 3, currentY + 5.5);
        doc.text(detail, 85, currentY + 5.5);
        const amountStr = (isNegative ? "-" : "") + amount.toLocaleString('id-ID');
        doc.text(amountStr, pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
        currentY += 8;
    };

    const diffMs = new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;

    addTableRow("Sewa Unit", `Harga sewa x ${diffDays} hari`, booking.basePrice);
    if (booking.driverFee > 0) addTableRow("Driver", `Biaya driver x ${diffDays} hari`, booking.driverFee);
    if (booking.deliveryFee > 0) addTableRow("Jasa Antar/Ambil", "Layanan antar jemput", booking.deliveryFee);
    
    if (booking.actualReturnDate) {
        const actStr = new Date(booking.actualReturnDate).toLocaleString('id-ID');
        addTableRow("Overtime", `Actual return (${actStr})`, booking.overtimeFee || 0);
    }
    
    if (booking.extraCost && booking.extraCost > 0) {
        addTableRow("Biaya Extra", booking.extraCostDescription || "Keterangan biaya extra", booking.extraCost);
    }

    if (booking.discount && booking.discount > 0) {
        addTableRow("Potongan Diskon", "Pengurangan harga khusus", booking.discount, true);
    }

    const drawSummaryRow = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
        if (isHighlight) {
            doc.setFillColor(245, 245, 245);
            doc.rect(pageWidth / 2, currentY, pageWidth / 2 - margin, 8, 'F');
        }
        doc.rect(pageWidth / 2, currentY, pageWidth / 2 - margin, 8, 'S');
        if (isBold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
        doc.text(label, pageWidth / 2 + 3, currentY + 5.5);
        doc.text(value, pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
        currentY += 8;
    };

    drawSummaryRow("TOTAL TAGIHAN", `Rp ${booking.totalPrice.toLocaleString('id-ID')}`, true, true);
    drawSummaryRow("Pembayaran Masuk", `Rp ${booking.amountPaid.toLocaleString('id-ID')}`);
    const sisa = booking.totalPrice - booking.amountPaid;
    drawSummaryRow("SISA TAGIHAN", `Rp ${sisa.toLocaleString('id-ID')}`, true, true);

    const isActuallyLunas = booking.paymentStatus === 'Lunas';
    doc.rect(pageWidth / 2, currentY, pageWidth / 2 - margin, 8, 'S');
    doc.setFont("helvetica", "bold");
    doc.text("STATUS PEMBAYARAN", pageWidth / 2 + 3, currentY + 5.5);
    
    if (isActuallyLunas) doc.setTextColor(22, 163, 74); 
    else doc.setTextColor(220, 38, 38); 
    
    doc.text(booking.paymentStatus.toUpperCase(), pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    if (isActuallyLunas) {
        doc.saveGraphicsState();
        doc.setTextColor(0, 150, 0);
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        doc.text("LUNAS", pageWidth - margin - 50, currentY - 20, { align: 'center', angle: 30 });
        doc.restoreGraphicsState();
    }

    currentY += 15;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Keterangan: ${booking.customerNote || "-"}`, margin, currentY);
    currentY += 10;

    const renderTextSection = (title: string, text: string) => {
        if (currentY + 20 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(title, margin, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
        lines.forEach((line: string) => {
            if (currentY + 5 > pageHeight - 20) { doc.addPage(); currentY = 20; }
            doc.text(line, margin, currentY);
            currentY += 4;
        });
        currentY += 6;
    };

    renderTextSection("KETENTUAN PEMBAYARAN:", settings.paymentTerms);
    renderTextSection("SYARAT & KETENTUAN SEWA:", settings.termsAndConditions);

    const sigY = (currentY + 45 > pageHeight - 15) ? (doc.addPage(), 20) : currentY + 5;
    const colWidth = (pageWidth - (margin * 2)) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Penyewa,", margin + (colWidth / 2), sigY, { align: 'center' });
    doc.line(margin + 10, sigY + 25, margin + colWidth - 10, sigY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(`(${booking.customerName})`, margin + (colWidth / 2), sigY + 30, { align: 'center' });

    const rightColX = margin + colWidth;
    doc.setFont("helvetica", "normal");
    doc.text("Hormat Kami,", rightColX + (colWidth / 2), sigY, { align: 'center' });
    if (settings.stampUrl) {
        try { doc.addImage(settings.stampUrl, 'PNG', rightColX + (colWidth / 2) - 17.5, sigY - 5, 35, 35); } catch (e) {}
    }
    doc.line(rightColX + 10, sigY + 25, pageWidth - margin - 10, sigY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(`(${settings.displayName || settings.companyName})`, rightColX + (colWidth / 2), sigY + 30, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(settings.invoiceFooter, pageWidth / 2, pageHeight - 10, { align: 'center' });

    drawFooterMetadata(doc, user);
    doc.save(`Invoice_${booking.customerName.replace(/\s+/g, '_')}_${booking.id.slice(0, 8)}.pdf`);
};

export const generateCollectiveInvoicePDF = (customer: Customer, bookings: Booking[], cars: Car[]) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const currentUser = getCurrentUser();
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const invId = `COL-${Date.now().toString().slice(-6)}`;

    // 1. CUSTOM HEADER
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("KEPADA YTH", margin, 20);
    doc.text("NAMA", margin, 25);
    doc.text("No. WA / HP", margin, 30);
    doc.text("Perihal", margin, 35);

    doc.setFont("helvetica", "normal");
    doc.text(`: ${customer.name}`, margin + 25, 25);
    doc.text(`: ${customer.phone}`, margin + 25, 30);
    doc.text(`: Permohonan Pembayaran Sewa Kendaraan`, margin + 25, 35);

    const companyBlockWidth = 115; 
    const companyX = pageWidth - margin - companyBlockWidth;
    const logoSize = 28; 
    const textOffset = logoSize + 5;
    
    if (settings.logoUrl) {
        try { doc.addImage(settings.logoUrl, 'PNG', companyX, 16, logoSize, logoSize); } catch (e) {}
    } else {
        doc.setLineWidth(0.1);
        doc.rect(companyX, 16, logoSize, logoSize);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(settings.companyName.toUpperCase(), companyX + textOffset, 22);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(settings.tagline.toUpperCase(), companyX + textOffset, 27);
    const splitAlamat = doc.splitTextToSize(settings.address, companyBlockWidth - textOffset - 2);
    doc.text(splitAlamat, companyX + textOffset, 32);
    doc.text(`${settings.phone} / ${settings.email}`, companyX + textOffset, 32 + (splitAlamat.length * 4.5));

    doc.setLineWidth(0.1);
    doc.setDrawColor(180);
    doc.line(margin, 46, pageWidth - margin, 46);

    doc.setFontSize(9);
    doc.text("Dengan Hormat,", margin, 54);
    doc.text(`Kami dari ${settings.companyName} melampirkan data pemakaian kendaraan yang sudah dipergunakan:`, margin, 59);

    const invBoxW = 70;
    doc.setLineWidth(0.1);
    doc.setDrawColor(0);
    doc.rect(pageWidth - margin - invBoxW, 51, invBoxW, 12);
    doc.text(`No. Invoice:`, pageWidth - margin - invBoxW + 3, 58);
    doc.setFont("helvetica", "bold");
    doc.text(`#${invId}`, pageWidth - margin - invBoxW + 28, 58.5);

    // 2. THE BIG TABLE
    let currentY = 70;
    const col = { no: 8, inv: 22, unit: 45, start: 32, end: 32, ovtTime: 20, rate: 28, extra: 25, ovtPrice: 25, sub: 35 };
    const totalTableW = Object.values(col).reduce((a, b) => a + b, 0);
    const startX = margin;

    doc.setLineWidth(0.1);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(248, 248, 248);
    doc.rect(startX, currentY, col.no + col.inv + col.unit + col.start + col.end + col.ovtTime, 8, 'F');
    doc.setFillColor(242, 242, 242);
    doc.rect(startX + col.no + col.inv + col.unit + col.start + col.end + col.ovtTime, currentY, col.rate + col.extra + col.ovtPrice + col.sub, 8, 'F');
    doc.rect(startX, currentY, totalTableW, 16, 'S'); 
    doc.text("DESKRIPSI", startX + (col.no + col.inv + col.unit + col.start + col.end + col.ovtTime) / 2, currentY + 5.5, { align: 'center' });
    doc.text("HARGA", startX + (col.no + col.inv + col.unit + col.start + col.end + col.ovtTime) + (col.rate + col.extra + col.ovtPrice + col.sub) / 2, currentY + 5.5, { align: 'center' });
    currentY += 8;

    doc.setFontSize(7.5);
    let drawX = startX;
    const drawColHead = (label: string, width: number) => {
        doc.rect(drawX, currentY, width, 8, 'S');
        doc.text(label, drawX + width/2, currentY + 5, { align: 'center' });
        drawX += width;
    };
    ["No.", "No. Invoice", "Kendaraan", "Tgl. Ambil", "Tgl. Kembali", "Overtime", "Sewa/Hari", "Extra Service", "Overtime", "Sub Total"].forEach((h, i) => drawColHead(h, Object.values(col)[i]));
    currentY += 8;

    // 3. ITEMS
    doc.setFont("helvetica", "normal");
    let totalAll = 0; let totalPaid = 0;
    bookings.forEach((b, i) => {
        totalAll += b.totalPrice; totalPaid += b.amountPaid;
        const car = cars.find(c => c.id === b.carId);
        const carDetail = b.isRentToRent ? `${b.externalCarName} (${b.externalCarPlate})` : `${car?.name} (${car?.plate})`;
        const days = Math.max(1, Math.ceil((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / (1000 * 60 * 60 * 24)));
        let ovtStr = "-";
        if (b.actualReturnDate && new Date(b.actualReturnDate) > new Date(b.endDate)) {
            ovtStr = `${Math.ceil((new Date(b.actualReturnDate).getTime() - new Date(b.endDate).getTime()) / (1000 * 60 * 60))} Jam`;
        }
        if (currentY + 10 > pageHeight - 65) { doc.addPage(); currentY = 20; }
        let curX = startX;
        [ (i+1).toString(), `#${b.id.slice(0,6)}`, carDetail, new Date(b.startDate).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}), new Date(b.endDate).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}), ovtStr, (b.basePrice/days).toLocaleString('id-ID'), (b.extraCost||0).toLocaleString('id-ID'), (b.overtimeFee||0).toLocaleString('id-ID'), b.totalPrice.toLocaleString('id-ID')].forEach((val, idx) => {
            const width = Object.values(col)[idx];
            doc.rect(curX, currentY, width, 10, 'S');
            const align = idx === 2 ? 'left' : [6,7,8,9].includes(idx) ? 'right' : 'center';
            doc.text(doc.splitTextToSize(val, width - 2), align === 'center' ? curX + width/2 : align === 'left' ? curX + 2 : curX + width - 2, currentY + 6, { align });
            curX += width;
        });
        currentY += 10;
    });

    // 4. SUMMARY (DYNAMICS POST-TABLE)
    const summaryW = col.sub + col.ovtPrice + col.extra + col.rate;
    const summaryX = pageWidth - margin - summaryW;
    const labelW = col.ovtPrice + col.extra + col.rate;

    // Draw Keterangan (Left side of same Y as Total)
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("Keterangan:", margin, currentY + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text("(detail biaya extra seperti BBM, Tol dan Parkir)", margin, currentY + 9);

    // Draw Summary Rows
    const drawSummaryRow = (label: string, value: string, isBold: boolean = false) => {
        doc.setLineWidth(0.1);
        doc.rect(summaryX, currentY, labelW, 8, 'S');
        doc.rect(summaryX + labelW, currentY, col.sub, 8, 'S');
        if (isBold) doc.setFont("helvetica", "bold"); else doc.setFont("helvetica", "normal");
        doc.text(label, summaryX + 2, currentY + 5.5);
        doc.text(value, pageWidth - margin - 2, currentY + 5.5, { align: 'right' });
        currentY += 8;
    };
    drawSummaryRow("TOTAL", totalAll.toLocaleString('id-ID'));
    drawSummaryRow("DP", totalPaid.toLocaleString('id-ID'));
    drawSummaryRow("GRAND TOTAL", (totalAll - totalPaid).toLocaleString('id-ID'), true);

    // 5. TERBILANG & SIGNATURE (CHECK SPACE)
    if (currentY + 85 > pageHeight) { doc.addPage(); currentY = 20; }
    
    currentY += 5;
    doc.setLineWidth(0.1); doc.setDrawColor(180);
    doc.rect(margin, currentY, totalTableW, 10);
    doc.setFont("helvetica", "normal"); doc.text("Terbilang:", margin + 2, currentY + 6.5);
    doc.setFont("helvetica", "bold"); doc.text(terbilang(totalAll - totalPaid), margin + 18, currentY + 6.5);

    currentY += 20;
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text("KETENTUAN PEMBAYARAN:", margin, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    const termLines = doc.splitTextToSize(settings.paymentTerms, 120);
    doc.text(termLines, margin, currentY);

    const sigX = pageWidth - margin - 25;
    doc.setFontSize(8.5);
    doc.text("Demikian kami sampaikan, atas perhatiannya kami sampaikan terimakasih", pageWidth - margin, currentY - 8, { align: 'right' });
    doc.text(`Denpasar, Tanggal: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 8;
    doc.text("Hormat saya,", sigX, currentY, { align: 'center' });
    
    if (settings.stampUrl) {
        try { doc.addImage(settings.stampUrl, 'PNG', sigX - 17.5, currentY + 2, 35, 35); } catch (e) {}
    }
    
    currentY += 35;
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    const sigName = currentUser?.name || "ADMIN";
    doc.text(sigName.toUpperCase(), sigX, currentY, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(sigX - 25, currentY + 1, sigX + 25, currentY + 1);

    drawFooterMetadata(doc, currentUser);
    doc.save(`Invoice_Kolektif_${customer.name.replace(/\s+/g, '_')}_${invId}.pdf`);
};

export const generateMonthlyReportPDF = (type: 'Driver' | 'Investor' | 'Vendor', entity: any, month: string, expenses: Transaction[], trips: Booking[]) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const user = getCurrentUser();
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let currentY = drawProfessionalHeader(
        doc, 
        settings, 
        `LAPORAN ${type.toUpperCase()}`, 
        "Nomor    :", 
        `Tanggal  : ${new Date().toLocaleDateString('id-ID')}`
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`Nama ${type}`, margin, currentY);
    doc.text(`: ${entity.name}`, margin + 30, currentY);
    doc.text("PERIODE", pageWidth / 2 + 5, currentY);
    doc.text(`: ${month}`, pageWidth / 2 + 30, currentY);
    currentY += 6;
    doc.text("No. WA / HP", margin, currentY);
    doc.text(`: ${entity.phone}`, margin + 30, currentY);
    currentY += 15;

    const boxW = (pageWidth - (margin * 2)) / 3;
    const totalAmount = type === 'Driver' 
        ? expenses.reduce((s, e) => s + e.amount, 0) 
        : type === 'Vendor' 
            ? trips.reduce((s, t) => s + (t.vendorFee || 0), 0)
            : trips.reduce((s, t) => s + t.totalPrice, 0); // Gross for Investor fallback

    const paid = expenses.filter(e => e.status === 'Paid').reduce((s, e) => s + e.amount, 0);
    const pending = expenses.filter(e => e.status !== 'Paid').reduce((s, e) => s + e.amount, 0);

    const drawColoredBox = (label: string, value: string, x: number, y: number, w: number, color: number[]) => {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, y, w, 15, 'F');
        doc.rect(x, y, w, 15, 'S');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(label, x + 2, y + 5);
        doc.setFontSize(10);
        doc.text(value, x + w - 2, y + 11, { align: 'right' });
    };

    const topLabel = type === 'Driver' ? "TOTAL GAJI" : type === 'Vendor' ? "TOTAL TAGIHAN" : "EST. BAGI HASIL";
    drawColoredBox(topLabel, `Rp ${totalAmount.toLocaleString('id-ID')}`, margin, currentY, boxW, [34, 211, 238]);
    drawColoredBox("DIBAYARKAN", `Rp ${paid.toLocaleString('id-ID')}`, margin + boxW, currentY, boxW, [34, 197, 94]);
    drawColoredBox("PIUTANG", `Rp ${pending.toLocaleString('id-ID')}`, margin + (boxW * 2), currentY, boxW, [245, 158, 11]);
    
    currentY += 25;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'Investor' ? "Riwayat Perjalanan Unit" : "Riwayat Perjalanan", margin, currentY);
    currentY += 5;

    doc.setFillColor(230, 230, 230);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFontSize(8);
    doc.text("Tanggal", margin + 2, currentY + 4.5);
    doc.text("Unit / Kendaraan", margin + 35, currentY + 4.5);
    doc.text("Durasi", margin + 85, currentY + 4.5);
    doc.text("Penyewa", margin + 110, currentY + 4.5);
    doc.text(type === 'Vendor' ? "HPP Vendor" : "Status", pageWidth - margin - 2, currentY + 4.5, { align: 'right' });
    currentY += 7;

    trips.forEach(t => {
        if (currentY + 10 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFont("helvetica", "normal");
        doc.text(new Date(t.startDate).toLocaleDateString('id-ID'), margin + 2, currentY + 4);
        
        const unitName = type === 'Vendor' ? (t.externalCarName || "-") : "Unit Armada";
        doc.text(doc.splitTextToSize(unitName, 45), margin + 35, currentY + 4); 

        const diffMs = new Date(t.endDate).getTime() - new Date(t.startDate).getTime();
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        doc.text(`${days} hari`, margin + 85, currentY + 4);
        doc.text(doc.splitTextToSize(t.customerName, 40), margin + 110, currentY + 4);
        
        if (type === 'Vendor') {
            doc.setFont("helvetica", "bold");
            doc.text(`Rp ${(t.vendorFee || 0).toLocaleString('id-ID')}`, pageWidth - margin - 2, currentY + 4, { align: 'right' });
        } else {
            if (t.status === 'Booked') doc.setTextColor(37, 99, 235);
            else if (t.status === 'Active') doc.setTextColor(220, 38, 38);
            else if (t.status === 'Completed') doc.setTextColor(22, 163, 74);
            doc.setFont("helvetica", "bold");
            doc.text(t.status.toUpperCase(), pageWidth - margin - 2, currentY + 4, { align: 'right' });
        }
        
        doc.setTextColor(0,0,0);
        doc.setDrawColor(230);
        doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
        currentY += 7;
    });

    currentY += 10;
    if (expenses.length > 0) {
        if (currentY + 25 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(type === 'Investor' ? "Riwayat Setoran" : "Riwayat Pembayaran & Klaim", margin, currentY);
        currentY += 5;

        doc.setFillColor(230, 230, 230);
        doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
        doc.setFontSize(8);
        doc.text("Tanggal", margin + 2, currentY + 4.5);
        doc.text("Deskripsi / Kategori", margin + 35, currentY + 4.5);
        doc.text("Nominal (Rp)", margin + 110, currentY + 4.5);
        doc.text("Status", pageWidth - margin - 2, currentY + 4.5, { align: 'right' });
        currentY += 7;

        expenses.forEach(e => {
            if (currentY + 10 > pageHeight - 20) { doc.addPage(); currentY = 20; }
            doc.setFont("helvetica", "normal");
            doc.text(new Date(e.date).toLocaleDateString('id-ID'), margin + 2, currentY + 4);
            doc.text(doc.splitTextToSize(`${e.description} (${e.category})`, 70), margin + 35, currentY + 4);
            doc.text(e.amount.toLocaleString('id-ID'), margin + 110, currentY + 4);
            const isPaid = e.status === 'Paid';
            doc.setTextColor(isPaid ? 22 : 220, isPaid ? 163 : 38, isPaid ? 74 : 38);
            doc.setFont("helvetica", "bold");
            doc.text(isPaid ? "PAID" : "PENDING", pageWidth - margin - 2, currentY + 4, { align: 'right' });
            doc.setTextColor(0,0,0);
            doc.setDrawColor(230);
            doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
            currentY += 7;
        });
    }

    drawFooterMetadata(doc, user);
    doc.save(`Laporan_${type}_${entity.name.replace(/\s+/g, '_')}_${month}.pdf`);
};

export const generateStatisticsPDF = (
    income: number, expense: number, profit: number, startDate: string, endDate: string,
    topFleet: any[], topCustomers: any[], statusCounts: any, ownershipStats: any[],
    driverStats: any[], paymentStats: any[], packageStats: any[], dailyHistogram: any[]
) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const user = getCurrentUser();
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let currentY = drawProfessionalHeader(doc, settings, "STATISTIK", "", "");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN STATISTIK BISNIS", pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    doc.setDrawColor(220, 38, 38); 
    doc.setLineWidth(0.8);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text("RINGKASAN KEUANGAN", margin, currentY);
    currentY += 10;

    const drawSummaryRow = (label: string, value: string, color?: number[]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(label, margin, currentY);
        doc.setFont("helvetica", "bold");
        if (color) doc.setTextColor(color[0], color[1], color[2]);
        else doc.setTextColor(80, 80, 80);
        doc.text(value, 80, currentY);
        currentY += 6;
    };

    drawSummaryRow("Total Pemasukan:", `Rp ${income.toLocaleString('id-ID')}`);
    drawSummaryRow("Total Pengeluaran:", `Rp ${expense.toLocaleString('id-ID')}`);
    drawSummaryRow("Profit Bersih:", `Rp ${profit.toLocaleString('id-ID')}`, profit >= 0 ? [34, 197, 94] : [220, 38, 38]);
    currentY += 10;

    drawFooterMetadata(doc, user);
    doc.save(`Laporan_Statistik_Bisnis_${startDate}.pdf`);
};

export const generateWhatsAppLink = (booking: Booking, car: Car) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const total = booking.totalPrice;
    const paid = booking.amountPaid;
    const remaining = total - paid;
    const status = booking.paymentStatus;
    
    let message = settings.whatsappTemplate
        .replace(/{company}/g, settings.companyName)
        .replace(/{invoiceNo}/g, booking.id.slice(0, 8))
        .replace(/{name}/g, booking.customerName)
        .replace(/{unit}/g, car.name + " (" + car.plate + ")")
        .replace(/{startDate}/g, new Date(booking.startDate).toLocaleString('id-ID'))
        .replace(/{endDate}/g, new Date(booking.endDate).toLocaleString('id-ID'))
        .replace(/{total}/g, total.toLocaleString('id-ID'))
        .replace(/{paid}/g, paid.toLocaleString('id-ID'))
        .replace(/{remaining}/g, remaining.toLocaleString('id-ID'))
        .replace(/{status}/g, status)
        .replace(/{footer}/g, settings.invoiceFooter);

    const phone = booking.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const generateDriverTaskLink = (booking: Booking, car: Car, driver: Driver) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const message = `Halo ${driver.name}, berikut tugas jalan Anda:
Unit: ${car.name} (${car.plate})
Tamu: ${booking.customerName}
Tujuan: ${booking.destination}
Mulai: ${new Date(booking.startDate).toLocaleString('id-ID')}
Selesai: ${new Date(booking.endDate).toLocaleString('id-ID')}
Catatan: ${booking.driverNote || '-'}

Terima kasih, Admin ${settings.companyName}`;
    const phone = driver.phone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};
