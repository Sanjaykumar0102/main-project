'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard/user');
    }
  }, [status, router]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1>FlowDesk</h1>
        <p>AI-Powered Workflow & Automation</p>
      </header>

      <div className={styles.content}>
        <Link href="/register" className={styles.cardLink}>
          <div className={styles.card}>
            <h2>Welcome</h2>
            <p>Get started by logging in or checking your dashboard.</p>
          </div>
        </Link>
      </div>
    </main>
  );
}
