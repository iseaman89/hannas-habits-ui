import React from 'react';
import { GoogleOAuthProvider } from "@react-oauth/google";
import PropTypes from "prop-types";
import GoogleButton from "./GoogleButton.jsx";

const CLIENT_ID = "492080002290-4e3cf09j00t5ptg89iqv68ffau0bedlg.apps.googleusercontent.com";

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