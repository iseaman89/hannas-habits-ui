import React, { useEffect, useState } from 'react';
import { getResolutions, updateResolution } from "../services/ResolutionService.js";
import EditableText from "../components/EditableText.jsx";
import {motion} from "motion/react";
import ArrowRightIcon from "../assets/icons/arrow-right.png";
import ArrowLeftIcon from "../assets/icons/arrow-left.png";
import { ToastContainer, toast } from 'react-toastify';

const ResolutionContainer = () => {
    const currentYear = new Date().getFullYear();
    const [resolutions, setResolutions] = useState([]);
    const [currentResolution, setCurrentResolution] = useState(null);
    const [year, setYear] = useState(currentYear);
    const [showButton, setShowButton] = React.useState(false);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getResolutions(userId, token);
                setResolutions(data);
            } catch (error) {
                console.log(error);
            }
        };
        fetchData();
    }, [userId, token]);

    useEffect(() => {
        setCurrentResolution(resolutions.find(r => r.year === year) || null);
    }, [resolutions, year]);

    const handleChangeResolution = (value, index) => {
        setCurrentResolution(prevState => {
            if (!prevState) return null;
            const updatedResolutions = [...prevState.resolutions];
            if (value === "") {
                updatedResolutions.splice(index, 1);
            } else {
                updatedResolutions[index] = { ...updatedResolutions[index], title: value };
            }
            return { ...prevState, resolutions: updatedResolutions };
        });
        setShowButton(true);
    };
    
    const handleAddResolution = (value) => {
        setCurrentResolution(prev => {
            const updatedResolutions = [...prev.resolutions];
            updatedResolutions.push({title: value});
            return { ...prev, resolutions: updatedResolutions };
        });
        setShowButton(true);
    }

    const handleUpdate = async () => {
        try {
            const data = await updateResolution(currentResolution.id, currentResolution, token);
            setCurrentResolution(data);
            setShowButton(false);
            toast.success('Updated!', {
                className: 'container'
            });
        } catch (error) {
            toast.error('Update failed!', {
                className: 'container'
            });
            console.log(error);
        }
    }
    
    const handleBackward = () => {
        if (resolutions.find(r => r.year === year - 1)) {
            setYear(year - 1);
        }
    }

    const handleForward = () => {
        if (year < currentYear) {
            setYear(year + 1);
        }
        
    }

    return (
        <div className="flex flex-col items-center justify-center w-screen h-full p-8">
            <h1 className="text-5xl font-title lg:text-7xl">
                My {currentResolution?.year} Resolutions
            </h1>
            <div className="flex w-full items-center justify-between lg:w-1/4">
                <img
                    src={ArrowLeftIcon}
                    alt=""
                    onClick={handleBackward}
                    className="hover:cursor-pointer transition-all hover:scale-125"
                />
                <h1 className="text-3xl text-center lg:text-4xl">
                    {year}
                </h1>
                <img
                    src={ArrowRightIcon}
                    alt=""
                    onClick={handleForward}
                    className="hover:cursor-pointer transition-all hover:scale-125"
                />
            </div>
            <div className="h-full max-w-3xl w-11/12 shadow-2xl m-8 p-4 md:w-4/5 xl:w-1/2 2xl:w-[30%]">
            <div
                    className="flex h-[80vh]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='25'%3E%3Cline x1='0' y1='24' x2='100%25' y2='24' stroke='%23bbb' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "100% 25px"
                    }}
                >
                    <div className="flex flex-col items-end justify-start px-4 h-full w-1/12">
                        {currentResolution?.resolutions?.map((r, i) => (
                            <p key={i}>
                                {i + 1}.
                            </p>
                        ))}
                    </div>
                    <div className="h-[80vh] w-0.5 bg-notes-blue-light"></div>
                    <div className="flex flex-col items-center justify-start h-full w-11/12 px-4">
                        {currentResolution?.resolutions?.map((r, i) => (
                            <EditableText
                                onChange={(value) => handleChangeResolution(value, i)}
                                value={r.title}
                                isResolution={true}
                                key={i}
                            />
                        ))}
                        <EditableText
                            onChange={(value) => handleAddResolution(value)}
                            value={''}
                            isResolution={true}
                        />
                    </div>
                </div>
            </div>
            <motion.button
                type="submit"
                onClick={handleUpdate}
                className={"fixed right-5 bg-white hover:cursor-pointer bottom-5 button px-8 py-1 text-2xl lg:absolute lg:right-20 lg:bottom-10 " + (showButton ? "" : "hidden")}
                initial={{opacity: 0}}
                whileInView={{opacity: 1}}
                transition={{duration: 1, ease: "ease-in"}}
            >
                Save
            </motion.button>
            <ToastContainer
                position="top-right"
                autoClose={3000}
            />
        </div>
    );
};

export default ResolutionContainer;