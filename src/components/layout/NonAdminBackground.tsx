import React from 'react';
import LiquidEther from '@/components/LiquidEther';
import { LaserFlow } from '@/components/react-bits/LaserFlow';

interface NonAdminBackgroundProps {
    children: React.ReactNode;
}

const NonAdminBackground = ({ children }: NonAdminBackgroundProps) => {
    return (
        <div className="relative min-h-screen bg-gradient-hero">
            {/* Background decorations - Liquid Ether */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <LiquidEther
                    colors={['#5227FF', '#FF9FFC', '#B19EEF']}
                    autoDemo={true}
                />
            </div>

            {/* Background decorations - Laser Flow */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <LaserFlow
                    color="#bd7aff"
                    wispDensity={1}
                    flowSpeed={0.35}
                    verticalSizing={2}
                    horizontalSizing={1.2}
                    fogIntensity={0.45}
                    fogScale={0.3}
                    wispSpeed={15}
                    wispIntensity={5}
                    flowStrength={0.25}
                    decay={1.1}
                    horizontalBeamOffset={0}
                    verticalBeamOffset={-0.5}
                />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};

export default NonAdminBackground;
