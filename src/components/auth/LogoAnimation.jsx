import React from 'react';
import { motion } from "motion/react";
import PropTypes from "prop-types";

const LogoAnimation = ({setShowLogin}) => {
    return (
        <motion.div 
            initial={{opacity: 0}} 
            animate={{opacity: 1}}
            transition={{duration: 2, ease: 'easeInOut'}}
            onAnimationComplete={() => setShowLogin(true)}
            className="flex flex-col items-center justify-center h-1/4 w-full lg:h-1/2 lg:w-1/3 transition-all duration-1000"
        >
            <h1 className="text-5xl text-center p-5 font-title md:text-6xl lg:text-7xl">
                Hanna&apos;s Habits
            </h1>
            <h4 className="text-base md:text-xl lg:text-2xl">
                Daily reflections, habits, and goals in one place.
            </h4>
        </motion.div>
    );
};

LogoAnimation.propTypes = {
    setShowLogin: PropTypes.func.isRequired,
}

export default LogoAnimation;