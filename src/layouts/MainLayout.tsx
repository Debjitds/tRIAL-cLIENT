import { GlobalBackground } from '@/components/GlobalBackground';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
    return (
        <GlobalBackground>
            <Outlet />
        </GlobalBackground>
    );
}
