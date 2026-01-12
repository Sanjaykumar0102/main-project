'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSession } from 'next-auth/react';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { data: session } = useSession();

    useEffect(() => {
        if (session?.user?.id) {
            const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

            newSocket.on('connect', () => {
                console.log('Socket connected');
                // Join user room
                newSocket.emit('joinRoom', session.user.id);
            });

            setSocket(newSocket);

            return () => newSocket.close();
        }
    }, [session]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
