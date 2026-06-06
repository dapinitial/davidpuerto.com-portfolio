import React, { useState, useEffect } from 'react';
import styles from './preloaderInfinite.module.css';

const PreloaderInfinite = ({ onComplete }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const bounceOutTimeout = setTimeout(() => {
            setIsExiting(true); // Trigger bounce animation
            const fadeOutTimeout = setTimeout(() => {
                if (onComplete) onComplete(); // Call onComplete after fade-out
            }, 500); // Delay matches fade-out duration

            return () => clearTimeout(fadeOutTimeout);
        }, 1000); // Delay matches bounce duration

        return () => clearTimeout(bounceOutTimeout);
    }, [onComplete]);

    return (
        <div
            className={`${styles.preloaderInfinite} ${isExiting ? styles.exitPreloader : ''
                }`}
        >
            <svg width="60px" height="60px" viewBox="0 0 100 100">
                <path
                    fill="none"
                    d="M24.3,30C11.4,30,5,43.3,5,50s6.4,20,19.3,20c19.3,0,32.1-40,51.4-40C88.6,30,95,43.3,95,50s-6.4,20-19.3,20C56.4,70,43.6,30,24.3,30z"
                    stroke="#fff"
                    strokeWidth="3"
                    strokeDasharray="205.271142578125 51.317785644531256"
                >
                    <animate
                        attributeName="stroke-dashoffset"
                        calcMode="linear"
                        values="0;256.58892822265625"
                        keyTimes="0;1"
                        dur="1.0"
                        begin="0"
                        repeatCount="indefinite"
                    />
                </path>
            </svg>
        </div>
    );
};

export default PreloaderInfinite;
