import React from 'react';
import {useGoogleLogin} from "@react-oauth/google";
import PropTypes from "prop-types";
import GoogleIcon from '../../assets/icons/google.svg';

const GoogleButton = ({onLoginSuccess}) => {
    const handleGoogleLogin = useGoogleLogin({
        onSuccess: (credentialResponse) => {
            onLoginSuccess(credentialResponse.credential);
            console.log(credentialResponse.credential);
        },
        onError: () => {
            
            console.log("Login Failed");
        },
        ux_mode: "popup"
    });
    
    return (
        <div>
            <button
                type="button"
                className="button gap-2 px-8 py-1 w-full text-xl hover:cursor-pointer flex justify-center lg:text-2xl"
                onClick={() => {
                    handleGoogleLogin()
                }}
            >
                <img 
                    src={GoogleIcon} 
                    alt="Google"
                    className="size-8"
                />
                Google Login
            </button>
        </div>
    );
};

GoogleButton.propTypes = {
    onLoginSuccess: PropTypes.func.isRequired,
}

export default GoogleButton;