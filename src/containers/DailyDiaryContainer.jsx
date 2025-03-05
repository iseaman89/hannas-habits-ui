import React from 'react';
import { getDailyDiaryByDay, updateDailyDiary, getDailyDiary } from "../services/DailyDiaryService.js";
import { motion } from "motion/react";
import Mood from "../components/daily-diary/Mood.jsx";
import HealthBar from "../components/daily-diary/HealthBar.jsx";
import Highlight from "../components/daily-diary/Highlight.jsx";
import Things from "../components/daily-diary/Things.jsx";
import Tasks from "../components/daily-diary/Tasks.jsx";
import {useLocation} from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';

const DailyDiaryContainer = () => {
    const [dailyDiary, setDailyDiary] = React.useState({});
    const [showButton, setShowButton] = React.useState(false);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const location = useLocation();
    const { id, date } = location.state || {};
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    React.useEffect(() => {
        if (dailyDiary) {
            setCurrentDate(new Date(dailyDiary?.date));
        }
    }, [dailyDiary]);

    React.useEffect(() => {
        const fetchDataByDay = async () => {
            const abortController = new AbortController();
            try {
                const data = await getDailyDiaryByDay(userId, date, token, { signal: abortController.signal });
                setDailyDiary(data);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error fetching topics', error);
                }
            }
        };

        const fetchDataById = async () => {
            try {
                const data = await getDailyDiary(id, token);
                setDailyDiary(data);
            } catch (error) {
                console.error('Error fetching topics', error);
            }
        };

        if (id === -1) {
            fetchDataByDay();
        } else {
            fetchDataById();
        }
    }, [userId, token, date, id]);
    
    const handleUpdate = async () => {
        try {
            const data = await updateDailyDiary(dailyDiary.id, dailyDiary, token);
            setDailyDiary(data);
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
    
    return (
        <div className="flex flex-col items-center w-screen p-4 overflow-y-scroll lg:p-8">
            <h1 className="text-5xl mt-4 font-title lg:text-7xl">
                {`Daily Diary (${currentDate.toLocaleDateString('en-GB').replace(/\//g, '-')})`}
            </h1>
            <div className="flex flex-col h-full w-full lg:w-3/4">
                <div className="flex flex-col gap-4  p-4 w-full lg:flex-row lg:gap-15 lg:p-8">
                    <Mood 
                        dailyDiary={dailyDiary} 
                        setDailyDiary={setDailyDiary}
                        setShowButton={setShowButton}
                    />
                    <HealthBar
                        dailyDiary={dailyDiary}
                        setDailyDiary={setDailyDiary}
                        name={'physical'} 
                        setShowButton={setShowButton}
                    />
                    <HealthBar 
                        dailyDiary={dailyDiary} 
                        setDailyDiary={setDailyDiary} 
                        name={'mental'}
                        setShowButton={setShowButton}
                    />
                </div>
                <div className="flex flex-col gap-4 px-4 w-full lg:flex-row lg:gap-15 lg:p-8">
                    <div className="flex flex-col h-full w-full lg:w-2/3 lg:h-screen">
                        <Highlight
                            dailyDiary={dailyDiary} 
                            setDailyDiary={setDailyDiary}
                            setShowButton={setShowButton}
                        />
                        <div className="flex flex-col gap-5 h-full py-4 lg:py-8 lg:gap-10 lg:flex-row">
                            <Things 
                                isLearned={true}
                                setDailyDiary={setDailyDiary} 
                                dailyDiary={dailyDiary} 
                                setShowButton={setShowButton}
                            />
                            <Things 
                                isLearned={false} 
                                setDailyDiary={setDailyDiary}
                                dailyDiary={dailyDiary} 
                                setShowButton={setShowButton}
                            />
                        </div>
                    </div>
                    <div className="h-full w-full lg:w-1/3">
                        <Tasks 
                            setDailyDiary={setDailyDiary} 
                            dailyDiary={dailyDiary} 
                            setShowButton={setShowButton}
                        />
                    </div>
                </div>

            </div>
            <motion.button 
                type="submit" 
                onClick={handleUpdate} 
                className={"fixed right-10 bg-white hover:cursor-pointer bottom-5 button px-8 py-1 text-2xl " + 
                        (showButton ? "" : "hidden") + " lg:absolute lg:right-20 lg:bottom-10"}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 1, ease: "ease-in" }}
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

export default DailyDiaryContainer;