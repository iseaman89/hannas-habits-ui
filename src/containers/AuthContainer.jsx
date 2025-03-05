import React from 'react';
import LogoAnimation from "../components/auth/LogoAnimation.jsx";
import LoginForm from "../components/auth/LoginForm.jsx";
import RegisterForm from "../components/auth/RegisterForm.jsx";

const AuthContainer = () => {
    const [showLogin, setShowLogin] = React.useState(false);
    const [showRegister, setShowRegister] = React.useState(false);
    
    return (
        <div className="flex flex-col items-center justify-center gap-2 h-screen w-screen lg:flex-row lg:gap-20">
            <LogoAnimation setShowLogin={setShowLogin} />
            {showLogin && (
                <div className="container h-2/3 w-3/4 md:w-1/2 md:h-1/2 lg:w-100 overflow-x-hidden">
                    <LoginForm showRegister={showRegister} setShowRegister={setShowRegister} />
                    <RegisterForm showRegister={showRegister} setShowRegister={setShowRegister} />
                </div>
            )}

        </div>
    );
};

export default AuthContainer;