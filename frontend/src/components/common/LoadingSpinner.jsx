import React from 'react';

const LoadingSpinner = ({ fullScreen = false }) => {
    const spinner = <div className="w-12 h-12 border-4 border-gray-200 border-t-yellow-500 rounded-full animate-spin"></div>;
    if (fullScreen) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">{spinner}</div>;
    }
    return spinner;
};

export default LoadingSpinner;