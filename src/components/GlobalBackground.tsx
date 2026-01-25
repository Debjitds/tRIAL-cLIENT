import React from 'react';
import { LaserFlow } from './react-bits/LaserFlow';
import LiquidEther from './LiquidEther';

interface GlobalBackgroundProps {
    children: React.ReactNode;
}

export function GlobalBackground({ children }: GlobalBackgroundProps) {
    return (
        <div className="relative min-h-screen w-full">
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute inset-0 z-0">
                    <LiquidEther
                        colors={['#5227FF', '#FF9FFC', '#B19EEF']}
                        mouseForce={20}
                        cursorSize={100}
                        isViscous={false}
                        viscous={30}
                        iterationsViscous={32}
                        iterationsPoisson={32}
                        dt={0.014}
                        BFECC={true}
                        resolution={0.5}
                        isBounce={false}
                        autoDemo={true}
                        autoSpeed={0.5}
                        autoIntensity={2.2}
                        takeoverDuration={0.25}
                        autoResumeDelay={1000}
                        autoRampDuration={0.6}
                    />
                </div>
                <div className="absolute inset-0 z-10 opacity-70">
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
            </div>
            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
}
