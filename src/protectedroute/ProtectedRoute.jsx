import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import PropTypes from "prop-types";

const ProtectedRoute = ({ children }) => {
    const { authData } = useContext(AuthContext);

    if (authData === null) {
        return <div>Loading...</div>;
    }
    if (!authData?.token) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node,
}

export default ProtectedRoute;
