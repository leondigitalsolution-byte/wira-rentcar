
import { User, Driver } from '../types';
import { getStoredData, setStoredData } from './dataService';

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'super',
    password: '123',
    name: 'Super Admin',
    email: 'super@brc.com',
    phone: '081200000000',
    role: 'superadmin',
    image: 'https://i.pravatar.cc/150?u=super'
  },
  {
    id: 'u2',
    username: 'admin',
    password: '123',
    name: 'Staff Operasional',
    email: 'admin@brc.com',
    phone: '081211111111',
    role: 'admin',
    image: 'https://i.pravatar.cc/150?u=admin'
  },
  {
    id: 'u3',
    username: 'driver',
    password: '123',
    name: 'Budi Santoso',
    email: 'budi@brc.com',
    phone: '081234567890',
    role: 'driver',
    linkedDriverId: 'd1', // Link to dummy driver Budi
    image: 'https://i.pravatar.cc/150?u=d1'
  }
];

// Initialize users in local storage if not exist, OR update if roles are stale
const initAuth = () => {
    const storedUsers = localStorage.getItem('users');
    
    if (!storedUsers) {
        setStoredData('users', INITIAL_USERS);
    } else {
        // Fix for missing Settings menu: 
        // Check if the 'super' user has the correct 'superadmin' role in storage.
        // If not (due to old data), force update it.
        const users = JSON.parse(storedUsers) as User[];
        const superUser = users.find(u => u.username === 'super');
        
        // Also ensure dummy driver exists for testing
        const driverUser = users.find(u => u.username === 'driver');
        
        if (!superUser || superUser.role !== 'superadmin' || !driverUser) {
            // Merge initial users with stored users to ensure superadmin/driver exists
            const mergedUsers = [...INITIAL_USERS];
            users.forEach(u => {
                if (!mergedUsers.find(mu => mu.username === u.username)) {
                    mergedUsers.push(u);
                }
            });
            setStoredData('users', mergedUsers);
        }
    }
}

export const login = (identifier: string, password: string): User | null => {
  initAuth();
  const users = getStoredData<User[]>('users', INITIAL_USERS);
  
  // Allow login by Username, Email, or Phone
  const user = users.find(u => 
    (u.username === identifier || u.email === identifier || u.phone === identifier) && 
    u.password === password
  );
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    return userWithoutPassword as User;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('currentUser');
  return stored ? JSON.parse(stored) : null;
};

export const getUsers = (): User[] => {
    initAuth();
    return getStoredData<User[]>('users', []);
}

export const saveUser = (user: User) => {
    initAuth();
    const users = getStoredData<User[]>('users', []);
    const exists = users.find(u => u.id === user.id);
    let newUsers;
    if (exists) {
        newUsers = users.map(u => u.id === user.id ? user : u);
    } else {
        newUsers = [...users, user];
    }
    setStoredData('users', newUsers);
}

export const deleteUser = (id: string) => {
    initAuth();
    const users = getStoredData<User[]>('users', []);
    setStoredData('users', users.filter(u => u.id !== id));
}
