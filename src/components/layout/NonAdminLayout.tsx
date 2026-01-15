import { Outlet } from 'react-router-dom';
import NonAdminBackground from './NonAdminBackground';

const NonAdminLayout = () => {
    return (
        <NonAdminBackground>
            <Outlet />
        </NonAdminBackground>
    );
};

export default NonAdminLayout;
