import React, { useContext } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { login, loginGoogle } from "../../services/AuthService.js";
import { AuthContext } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import PropTypes from "prop-types";
import LoginGoogle from "./LoginGoogle.jsx";

function LoginForm({showRegister, setShowRegister}) {
    const { authLogin } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLoginGoogle = async (idToken) => {
        try {
            console.log(idToken)
            const response = await loginGoogle(idToken);
            authLogin(response);
            navigate('/daily-diary', {state: {id: -1, date: new Date().toISOString()}});
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };

    return (
        <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={Yup.object({
                email: Yup.string().email('Wrong email').required("Required field"),
                password: Yup.string().min(8, 'Min 8 symbols').required("Required field"),
            })}
            onSubmit={async (values, { setSubmitting }) => {
                try {
                    const data = await login(values.email, values.password);
                    authLogin(data);
                    toast.success('Login successful!');
                    navigate('/daily-diary', {state: {id: -1, date: new Date().toISOString()}});
                } catch (error) {
                    toast.error('Please check your credentials.', {
                        className: 'container',
                        ariaLabel: 'Login failed!',
                    });
                    console.error('Login error', error);
                } finally {
                    setSubmitting(false);
                }
            }}
        >
            {({ isSubmitting }) => (
               <AnimatePresence mode="wait" initial={false}>
                   {!showRegister && (
                       <motion.div
                           key="login-from"
                           initial={{x: 400}}
                           animate={{x: 0}}
                           exit={{x: -400}}
                           transition={{duration: 1, ease: 'easeInOut'}}
                           className="h-full"
                       >
                           <Form className="flex flex-col items-center p-8 justify-between  h-full w-full">
                               <h3 className="text-4xl lg:text-6xl">
                                   Login
                               </h3>
                               <Field
                                   type="email"
                                   name="email"
                                   placeholder="Email..."
                                   className="font-gaegu focus:outline-0 text-xl w-3/4 border-0 border-b-2 lg:text-2xl"
                               />
                               <ErrorMessage
                                   name="email"
                                   component="div"
                                   className="error font-gaegu text-base text-status-cancel lg:text-2xl"
                               />
                               <Field
                                   type="password"
                                   name="password"
                                   placeholder="Password..."
                                   className="font-gaegu focus:outline-none text-xl w-3/4 border-0 border-b-2 lg:text-2xl"
                               />
                               <ErrorMessage
                                   name="password"
                                   component="div"
                                   className="error font-gaegu text-base text-status-cancel lg:text-2xl"
                               />

                               <div className="w-3/4">
                                   <LoginGoogle onLoginSuccess={handleLoginGoogle}/>
                               </div>

                               <button
                                   type="submit"
                                   disabled={isSubmitting}
                                   className="button px-8 py-1 w-3/4 text-xl hover:cursor-pointer lg:text-2xl"
                               >
                                   {isSubmitting ? 'Loading...' : 'Login'}
                               </button>

                               <p className="text-base lg:text-xl">Any account?
                                   <button
                                       className="px-2 hover:cursor-pointer hover:text-highlight-3"
                                       type="button"
                                       onClick={() => setShowRegister(!showRegister)}
                                   >
                                       Register
                                   </button>
                               </p>

                               <ToastContainer
                                   position="top-right"
                                   autoClose={3000}
                               />
                           </Form>
                       </motion.div>
                   )}
               </AnimatePresence>
            )}
        </Formik>
    );
}

LoginForm.propTypes = {
    showRegister: PropTypes.bool.isRequired,
    setShowRegister: PropTypes.func.isRequired,
}

export default LoginForm;