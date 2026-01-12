'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './login.module.css';

export default function LoginPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [error, setError] = useState('');
    const router = useRouter();

    const { email, password } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Invalid credentials');
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch (err) {
            setError('Something went wrong');
        }
    };

    const handleOAuthSignIn = (provider) => {
        signIn(provider, { callbackUrl: '/dashboard' });
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1>Login</h1>
                <p>Welcome back to FlowDesk</p>

                {error && <div className={styles.error}>{error}</div>}

                <form onSubmit={onSubmit} className={styles.form}>
                    <div className={styles.group}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <div className={styles.group}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                        />
                    </div>
                    <button type="submit" className={styles.button}>Login</button>
                </form>

                <div className={styles.divider}>
                    <span>Or continue with</span>
                </div>

                <div className={styles.socialButtons}>
                    <button
                        type="button"
                        className={`${styles.socialBtn} ${styles.google}`}
                        onClick={() => handleOAuthSignIn('google')}
                    >
                        Google
                    </button>
                    <button
                        type="button"
                        className={`${styles.socialBtn} ${styles.github}`}
                        onClick={() => handleOAuthSignIn('github')}
                    >
                        GitHub
                    </button>

                </div>

                <p className={styles.footer}>
                    Don't have an account? <Link href="/register">Register</Link>
                </p>
            </div>
        </div>
    );
}
