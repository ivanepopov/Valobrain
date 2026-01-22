const LoadingPage = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-gray-900/50 border border-gray-800 rounded-xl animate-pulse" />
                ))}
            </div>
            <div className="hidden lg:block h-96 bg-gray-900/20 border border-gray-800 rounded-2xl animate-pulse" />
        </div>
    );
};

export default LoadingPage;