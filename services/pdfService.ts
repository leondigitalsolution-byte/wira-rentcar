
import jsPDF from "jspdf";
import { Booking, Car, AppSettings, Transaction, Partner, Driver, BookingStatus } from "../types";
import { getStoredData, DEFAULT_SETTINGS } from "./dataService";

// --- REUSABLE COMPONENTS ---

const drawProfessionalHeader = (doc: jsPDF, settings: AppSettings, title: string, subTitle1?: string, subTitle2?: string) => {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // 1. Draw Logo
    const logoSize = 22;
    if (settings.logoUrl) {
        try { doc.addImage(settings.logoUrl, 'PNG', margin, y, logoSize, logoSize); } 
        catch (e) { drawLogoFallback(doc, margin, y, 0.35); }
    } else {
        drawLogoFallback(doc, margin, y, 0.35);
    }

    // 2. Company Info (Kop)
    const companyTextX = margin + logoSize + 5;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(settings.companyName.toUpperCase(), companyTextX, y + 6);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(settings.tagline.toUpperCase(), companyTextX, y + 11);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(settings.address, companyTextX, y + 16);
    doc.text(`${settings.phone} | ${settings.email}`, companyTextX, y + 20);

    // 3. Right Side Box (INVOICE / REPORT TITLE)
    const boxW = 55;
    const boxH = 10;
    const boxX = pageWidth - margin - boxW;
    doc.setFillColor(252, 220, 220); // Pinkish secondary color from ref
    doc.rect(boxX, y, boxW, boxH, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, boxX + (boxW / 2), y + 7, { align: 'center' });

    // Subtitles below box (Nomor, Tanggal, etc)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (subTitle1) doc.text(subTitle1, boxX, y + boxH + 6);
    if (subTitle2) doc.text(subTitle2, boxX, y + boxH + 11);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 30, pageWidth - margin, y + 30);

    return y + 40; // Return next Y position
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
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let currentY = drawProfessionalHeader(
        doc, 
        settings, 
        "INVOICE", 
        `Nomor    : #${booking.id.slice(0, 8)}`, 
        `Tanggal  : ${new Date(booking.createdAt).toLocaleDateString('id-ID')}`
    );

    // --- 1. DETAIL SECTION (Two Columns) ---
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

    // Row 1
    doc.text("NAMA PENYEWA", margin, currentY);
    doc.text(`: ${booking.customerName}`, valueX, currentY);
    doc.text("Unit", rightX, currentY);
    doc.text(`: ${car.name}`, rightX + rLabelW, currentY);
    currentY += 6;

    // Row 2
    doc.text("No. WA / HP", margin, currentY);
    doc.text(`: ${booking.customerPhone}`, valueX, currentY);
    doc.text("Nopol", rightX, currentY);
    doc.text(`: ${car.plate}`, rightX + rLabelW, currentY);
    currentY += 6;

    // Row 3
    doc.text("Alamat", margin, currentY);
    const addrLines = doc.splitTextToSize(booking.notes || '-', pageWidth / 2 - margin - labelW);
    doc.text(`: ${addrLines[0]}`, valueX, currentY);
    doc.text("Paket", rightX, currentY);
    doc.text(`: ${booking.packageType}`, rightX + rLabelW, currentY);
    currentY += 6;

    // Row 4
    doc.text("Tgl. Ambil", margin, currentY);
    doc.text(`: ${new Date(booking.startDate).toLocaleString('id-ID')}`, valueX, currentY);
    currentY += 6;

    // Row 5
    doc.text("Tgl. Kembali", margin, currentY);
    doc.text(`: ${new Date(booking.endDate).toLocaleString('id-ID')}`, valueX, currentY);
    currentY += 15;

    // --- 2. RINCIAN BIAYA TABLE ---
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

    const addTableRow = (desc: string, detail: string, amount: number) => {
        doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'S');
        doc.setFont("helvetica", "normal");
        doc.text(desc, margin + 3, currentY + 5.5);
        doc.text(detail, 85, currentY + 5.5);
        doc.text(amount.toLocaleString('id-ID'), pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
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

    // Summary Rows
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
    
    if (isActuallyLunas) {
        doc.setTextColor(22, 163, 74); // Green
    } else {
        doc.setTextColor(220, 38, 38); // Red
    }
    
    doc.text(booking.paymentStatus.toUpperCase(), pageWidth - margin - 3, currentY + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    
    // --- STAMP LUNAS ---
    if (isActuallyLunas) {
        doc.saveGraphicsState();
        try {
            // Safe casting for GState usage
            const GState = (doc as any).GState;
            if (GState) {
                doc.setGState(new GState({ opacity: 0.3 }));
            }
        } catch(e) {
            // fallback if GState fails
        }
        doc.setTextColor(0, 150, 0);
        doc.setFontSize(40);
        doc.setFont("helvetica", "bold");
        const stampX = pageWidth - margin - 50;
        const stampY = currentY - 20;
        
        // Rotate text
        doc.text("LUNAS", stampX, stampY, { align: 'center', angle: 30 });
        
        doc.restoreGraphicsState();
    }

    currentY += 15;

    // --- 3. FOOTER TERMS (Multi-page Support) ---
    const checkPageBreak = (needed: number) => {
        if (currentY + needed > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
            return true;
        }
        return false;
    };

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Keterangan: ${booking.customerNote || "-"}`, margin, currentY);
    currentY += 10;

    const renderTextSection = (title: string, text: string) => {
        checkPageBreak(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(title, margin, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, pageWidth - (margin * 2));
        lines.forEach((line: string) => {
            if (checkPageBreak(5)) currentY += 5;
            doc.text(line, margin, currentY);
            currentY += 4;
        });
        currentY += 6;
    };

    renderTextSection("KETENTUAN PEMBAYARAN:", settings.paymentTerms);
    renderTextSection("SYARAT & KETENTUAN SEWA:", settings.termsAndConditions);

    // --- 4. SIGNATURE SECTION ---
    // Check if we need a new page for signatures
    if (currentY + 45 > pageHeight - 15) {
        doc.addPage();
        currentY = 20;
    } else {
        currentY += 5;
    }

    const sigY = currentY;
    const colWidth = (pageWidth - (margin * 2)) / 2;
    
    // Left Column: Penyewa
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Penyewa,", margin + (colWidth / 2), sigY, { align: 'center' });
    
    // Line for Penyewa
    doc.line(margin + 10, sigY + 25, margin + colWidth - 10, sigY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(`(${booking.customerName})`, margin + (colWidth / 2), sigY + 30, { align: 'center' });

    // Right Column: Company
    const rightColX = margin + colWidth;
    doc.setFont("helvetica", "normal");
    doc.text("Hormat Kami,", rightColX + (colWidth / 2), sigY, { align: 'center' });

    // Company Stamp (Overlay)
    if (settings.stampUrl) {
        try {
            // Position stamp centered over the signature line
            // Adjust dimensions (w: 35, h: 35) and position relative to sigY
            doc.addImage(settings.stampUrl, 'PNG', rightColX + (colWidth / 2) - 17.5, sigY - 5, 35, 35);
        } catch (e) {
            console.error("Failed to add stamp image", e);
        }
    }

    // Line for Company
    doc.line(rightColX + 10, sigY + 25, pageWidth - margin - 10, sigY + 25);
    doc.setFont("helvetica", "bold");
    doc.text(`(${settings.displayName || settings.companyName})`, rightColX + (colWidth / 2), sigY + 30, { align: 'center' });

    // --- FOOTER ---
    const finalY = pageHeight - 10;
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text(settings.invoiceFooter, pageWidth / 2, finalY, { align: 'center' });

    doc.save(`Invoice_${booking.customerName.replace(/\s+/g, '_')}_${booking.id.slice(0, 8)}.pdf`);
};

export const generateMonthlyReportPDF = (type: 'Driver' | 'Investor', entity: any, month: string, expenses: Transaction[], trips: Booking[]) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    let currentY = drawProfessionalHeader(
        doc, 
        settings, 
        `LAPORAN ${type.toUpperCase()}`, 
        "Nomor    :", 
        `Tanggal  : ${new Date().toLocaleDateString('id-ID')}`
    );

    // Info Section
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

    // Summary Boxes (Standardized UI with colors from ref)
    const boxW = (pageWidth - (margin * 2)) / 3;
    const totalAmount = type === 'Driver' ? expenses.reduce((s, e) => s + e.amount, 0) : trips.reduce((s, t) => s + t.totalPrice, 0);
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

    // Colors: Cyan, Green, Orange
    drawColoredBox(type === 'Driver' ? "TOTAL GAJI" : "TOTAL SETORAN", `Rp ${totalAmount.toLocaleString('id-ID')}`, margin, currentY, boxW, [34, 211, 238]);
    drawColoredBox("DIBAYARKAN", `Rp ${paid.toLocaleString('id-ID')}`, margin + boxW, currentY, boxW, [34, 197, 94]);
    drawColoredBox("PIUTANG", `Rp ${pending.toLocaleString('id-ID')}`, margin + (boxW * 2), currentY, boxW, [245, 158, 11]);
    
    currentY += 25;

    const checkPageBreak = (needed: number) => {
        if (currentY + needed > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
            return true;
        }
        return false;
    };

    // Table 1: Riwayat Perjalanan
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'Investor' ? "Riwayat Perjalanan Unit" : "Riwayat Perjalanan", margin, currentY);
    currentY += 5;

    doc.setFillColor(230, 230, 230);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFontSize(8);
    doc.text("Tanggal", margin + 2, currentY + 4.5);
    doc.text("Unit", margin + 35, currentY + 4.5);
    doc.text("Durasi", margin + 85, currentY + 4.5);
    doc.text("Penyewa", margin + 110, currentY + 4.5);
    doc.text("Status", pageWidth - margin - 2, currentY + 4.5, { align: 'right' });
    currentY += 7;

    trips.forEach(t => {
        checkPageBreak(10);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(t.startDate).toLocaleDateString('id-ID'), margin + 2, currentY + 4);
        doc.text("Unit Mobil", margin + 35, currentY + 4); // Logic for car name omitted for brevity
        
        const diffMs = new Date(t.endDate).getTime() - new Date(t.startDate).getTime();
        const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        doc.text(`${days} hari`, margin + 85, currentY + 4);
        doc.text(t.customerName, margin + 110, currentY + 4);

        // Status coloring
        if (t.status === 'Booked') doc.setTextColor(37, 99, 235);
        else if (t.status === 'Active') doc.setTextColor(220, 38, 38);
        else if (t.status === 'Completed') doc.setTextColor(22, 163, 74);
        
        doc.setFont("helvetica", "bold");
        doc.text(t.status.toUpperCase(), pageWidth - margin - 2, currentY + 4, { align: 'right' });
        doc.setTextColor(0,0,0);
        doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
        currentY += 7;
    });

    currentY += 10;

    // Table 2: Riwayat Setoran / Gaji
    checkPageBreak(25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'Investor' ? "Riwayat Setoran" : "Riwayat Gaji & Reimbursement", margin, currentY);
    currentY += 5;

    doc.setFillColor(230, 230, 230);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 7, 'F');
    doc.setFontSize(8);
    doc.text("Tanggal", margin + 2, currentY + 4.5);
    doc.text(type === 'Investor' ? "Detail" : "Kategori", margin + 35, currentY + 4.5);
    if (type === 'Driver') doc.text("Detail", margin + 75, currentY + 4.5);
    doc.text("Nominal (Rp)", type === 'Driver' ? margin + 130 : margin + 110, currentY + 4.5);
    doc.text("Status", pageWidth - margin - 2, currentY + 4.5, { align: 'right' });
    currentY += 7;

    expenses.forEach(e => {
        checkPageBreak(10);
        doc.setFont("helvetica", "normal");
        doc.text(new Date(e.date).toLocaleDateString('id-ID'), margin + 2, currentY + 4);
        doc.text(type === 'Driver' ? e.category : e.description, margin + 35, currentY + 4);
        if (type === 'Driver') {
            const detailLines = doc.splitTextToSize(e.description, 50);
            doc.text(detailLines[0], margin + 75, currentY + 4);
        }
        doc.text(e.amount.toLocaleString('id-ID'), type === 'Driver' ? margin + 130 : margin + 110, currentY + 4);

        const isPaid = e.status === 'Paid';
        doc.setTextColor(isPaid ? 22 : 220, isPaid ? 163 : 38, isPaid ? 74 : 38);
        doc.setFont("helvetica", "bold");
        doc.text(isPaid ? "PAID" : "UNPAID", pageWidth - margin - 2, currentY + 4, { align: 'right' });
        doc.setTextColor(0,0,0);
        doc.line(margin, currentY + 6, pageWidth - margin, currentY + 6);
        currentY += 7;
    });

    doc.save(`Laporan_${type}_${entity.name}_${month}.pdf`);
};

export const generateStatisticsPDF = (
    income: number, expense: number, profit: number, startDate: string, endDate: string,
    topFleet: any[], topCustomers: any[], statusCounts: any, ownershipStats: any[],
    driverStats: any[], paymentStats: any[], packageStats: any[], dailyHistogram: any[]
) => {
    const settings = getStoredData<AppSettings>('appSettings', DEFAULT_SETTINGS);
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let currentY = drawProfessionalHeader(
        doc, 
        settings, 
        "STATISTIK", 
        "", 
        ""
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LAPORAN STATISTIK BISNIS", pageWidth / 2, currentY, { align: 'center' });
    currentY += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode: ${startDate} s/d ${endDate}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 12;

    // --- 1. RINGKASAN KEUANGAN ---
    doc.setDrawColor(220, 38, 38); // Red
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

    // --- 2. RINGKASAN OPERASIONAL ---
    doc.setDrawColor(220, 38, 38);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    doc.setTextColor(110, 110, 110);
    doc.text("RINGKASAN OPERASIONAL", margin, currentY);
    currentY += 10;

    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const opStats = [
        { label: "Total Booking", value: statusCounts.Booked + statusCounts.Active + statusCounts.Completed },
        { label: "Booking", value: statusCounts.Booked },
        { label: "Aktif", value: statusCounts.Active },
        { label: "Selesai", value: statusCounts.Completed }
    ];
    let opX = margin;
    const opW = (pageWidth - (margin * 2)) / 4;
    opStats.forEach(stat => {
        doc.setFont("helvetica", "bold");
        doc.text(stat.label + ": " + stat.value, opX, currentY);
        opX += opW;
    });
    currentY += 15;

    // --- 3. TOP 5 UNIT & TOP 5 PELANGGAN ---
    const drawHorizontalBarChart = (title: string, data: any[], x: number, y: number, w: number, barColor: number[]) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(title, x, y);
        let chartY = y + 5;
        const maxVal = Math.max(...data.map(d => d.value), 1);
        const barMaxW = w - 40;

        data.forEach(item => {
            doc.setFillColor(245, 245, 245);
            doc.rect(x, chartY, w, 12, 'F');
            doc.setFillColor(barColor[0], barColor[1], barColor[2]);
            const barW = (item.value / maxVal) * barMaxW;
            doc.rect(x + 35, chartY + 3, barW, 6, 'F');
            
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text(item.name.substring(0, 15), x + 2, chartY + 7.5);
            doc.setFont("helvetica", "bold");
            doc.text(item.value.toString(), x + 35 + barW + 2, chartY + 7.5);
            chartY += 14;
        });
    };

    drawHorizontalBarChart("TOP 5 UNIT TERLARIS", topFleet, margin, currentY, 85, [99, 102, 241]);
    drawHorizontalBarChart("TOP 5 PELANGGAN", topCustomers, pageWidth / 2 + 5, currentY, 85, [79, 70, 229]);
    currentY += 85;

    // --- 4. PERFORMA DRIVER & PEMBAYARAN ---
    drawHorizontalBarChart("PERFORMA DRIVER", driverStats, margin, currentY, 85, [245, 158, 11]);
    
    // Distribusi Pembayaran (Simple Box UI instead of complex Donut)
    const payX = pageWidth / 2 + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text("DISTRIBUSI PEMBAYARAN", payX, currentY);
    
    let payY = currentY + 15;
    paymentStats.forEach((stat, i) => {
        doc.setFillColor(i === 0 ? 34 : 220, i === 0 ? 197 : 38, i === 0 ? 94 : 38);
        doc.rect(payX + 60, payY - 3, 4, 4, 'F');
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`${stat.name}: ${stat.value}`, payX + 66, payY);
        payY += 7;
    });

    // Donut Placeholder Visual
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(5);
    doc.circle(payX + 30, currentY + 35, 18, 'S');
    currentY += 85;

    // --- 5. GRAFIK HARIAN ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GRAFIK PENDAPATAN HARIAN", margin, currentY);
    currentY += 5;

    const histH = 40;
    const histW = pageWidth - (margin * 2);
    doc.setFillColor(252, 252, 252);
    doc.rect(margin, currentY, histW, histH, 'F');
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    for(let i=1; i<=4; i++) {
        doc.line(margin, currentY + (i * histH / 4), margin + histW, currentY + (i * histH / 4));
    }

    const maxHist = Math.max(...dailyHistogram.map(d => d.Pemasukan), 1);
    const barW = (histW / dailyHistogram.length) * 0.6;
    const gap = (histW / dailyHistogram.length) * 0.4;
    let histX = margin + gap/2;
    
    dailyHistogram.forEach(day => {
        const h = (day.Pemasukan / maxHist) * (histH - 5);
        doc.setFillColor(34, 197, 94);
        doc.rect(histX, currentY + histH - h, barW, h, 'F');
        histX += barW + gap;
    });

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
