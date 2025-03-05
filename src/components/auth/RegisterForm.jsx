import React from 'react';
import * as Yup from "yup";
import {register} from "../../services/AuthService.js";
import {toast, ToastContainer} from "react-toastify";
import {motion, AnimatePresence} from "motion/react";
import {ErrorMessage, Field, Form, Formik} from "formik";
import PropTypes from "prop-types";

const RegisterForm = ({showRegister, setShowRegister}) => {
    return (
        <Formik
            initialValues={{ email: '', password: '', firstName: '', lastName: '' }}
            validationSchema={Yup.object({
                email: Yup.string().email('Wrong email').required("Required field"),
                password: Yup.string().min(8, 'Min 8 symbols').required("Required field"),
                firstName: Yup.string().min(2, 'Min 2 symbols').required("Required field"),
                lastName: Yup.string().min(2, 'Min 2 symbols').required("Required field"),
            })}
            onSubmit={async (values, { setSubmitting }) => {
                try {
                    await register(values);
                    toast.success('Register successful!');
                } catch (error) {
                    toast.error('Register failed! Please check your credentials.');
                    console.error('Register error', error);
                } finally {
                    setSubmitting(false);
                }
            }}
        >
            {({ isSubmitting }) => (
               <AnimatePresence mode="wait" initial={false}>
                   {showRegister && (
                       <motion.div
                           key="register"
                           initial={{x: 400}}
                           animate={{x: 0}}
                           exit={{x: -400}}
                           transition={{duration: 1, ease: 'easeInOut'}}
                           className="h-full"
                       >
                           <Form className="flex flex-col items-center p-8 justify-between  h-full w-full">
                               <h3 className="text-4xl lg:text-6xl">
                                   Register
                               </h3>
                               <Field
                                   type="text"
                                   name="firstName"
                                   placeholder="First Name..."
                                   className="font-gaegu focus:outline-0 text-xl w-3/4 border-0 border-b-2 lg:text-2xl"
                               />
                               <ErrorMessage
                                   name="firstName"
                                   component="div"
                                   className="error font-gaegu text-base text-status-cancel lg:text-2xl"
                               />
                               <Field
                                   type="text"
                                   name="lastName"
                                   placeholder="Last Name..."
                                   className="font-gaegu focus:outline-0 text-xl w-3/4 border-0 border-b-2 lg:text-2xl"
                               />
                               <ErrorMessage
                                   name="lastName"
                                   component="div"
                                   className="error font-gaegu text-base text-status-cancel lg:text-2xl"
                               />
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

                               <button
                                   type="submit"
                                   disabled={isSubmitting}
                                   className="button px-8 py-1 w-3/4 text-xl hover:cursor-pointer lg:text-2xl"
                               >
                                   {isSubmitting ? 'Loading...' : 'Register'}
                               </button>

                               <p className="text-base lg:text-xl">Already have an account?
                                   <button
                                       className="px-2 hover:cursor-pointer hover:text-highlight-3"
                                       type="button"
                                       onClick={() => setShowRegister(!showRegister)}
                                   >
                                       Sign in
                                   </button>
                               </p>

                               <ToastContainer
                                   className="container"
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
};

RegisterForm.propTypes = {
    showRegister: PropTypes.bool.isRequired,
    setShowRegister: PropTypes.func.isRequired,
}

export default RegisterForm;