import React from 'react';

const LoadingSpinner = ({ size = 'md', fullScreen = false, text = '' }) => {
    const sizeClass = {
        sm: 'spinner-sm',
        md: '',
        lg: 'spinner-lg',
    }[size] || '';

    const spinner = (
        <div className="flex-center" style={{ flexDirection: 'column', gap: '12px' }}>
            <div className={`spinner ${sizeClass}`}></div>
            {text && <p style={{ color: '#6b7280', fontSize: '14px' }}>{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh', background: '#f8fafc' }}>
                {spinner}
            </div>
        );
    }

    return spinner;
};

export default LoadingSpinner;