import React from 'react';

const MainLayout = ({ children, headerRight }) => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-md flex flex-col gap-6 h-full">
                <header className="flex justify-between items-center py-4">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Rápido</h1>
                    {headerRight}
                </header>
                <main className="flex-1 flex flex-col gap-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
