import React from 'react';
import { LaserFlow } from './react-bits/LaserFlow';

interface GlobalBackgroundProps {
    children: React.ReactNode;
}

export function GlobalBackground({ children }: GlobalBackgroundProps) {
    return (
        <div className="relative min-h-screen w-full">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
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
            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
}
