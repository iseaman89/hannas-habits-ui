import React from 'react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import PropTypes from "prop-types";
import GoogleButton from "./GoogleButton.jsx";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const LoginGoogle = ({onLoginSuccess}) => {    
    return (
        <div>
            <GoogleOAuthProvider clientId={CLIENT_ID}>
                <GoogleButton onLoginSuccess={onLoginSuccess}/>
            </GoogleOAuthProvider>
        </div>
    );
};

LoginGoogle.propTypes = {
    onLoginSuccess: PropTypes.func.isRequired,
}

export default LoginGoogle;