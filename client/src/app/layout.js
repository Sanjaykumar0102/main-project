import { Geist, Geist_Mono } from "next/font/google";
import { SocketProvider } from '../context/SocketContext'; // Import SocketProvider
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FlowDesk",
  description: "AI-Powered Workflow & Automation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <SocketProvider>
            {children}
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}
