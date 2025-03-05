import React from 'react';
import PropTypes from "prop-types";

function HealthBar({dailyDiary, setDailyDiary, name, setShowButton}) {
    const [progress, setProgress] = React.useState(
        name === 'mental' ? dailyDiary.mentalMood : dailyDiary.physicalMood);
    const progressBarRef = React.useRef(null);

    React.useEffect(() => {
        setProgress(name === 'mental' ? dailyDiary.mentalMood ?? 0 : dailyDiary.physicalMood ?? 0);
    }, [dailyDiary, name]);

    const handleClick = (event) => {
        if (!progressBarRef.current) return;
        const { left, width } = progressBarRef.current.getBoundingClientRect();
        const clickX = event.clientX - left;
        const newProgress = Math.round((clickX / width) * 100);
        setShowButton(true);
        setProgress(newProgress);
        setDailyDiary(prev => ({...prev, [name === 'mental' ? 'mentalMood' : 'physicalMood']: newProgress}));
    };

    return (
        <div className="flex flex-col items-center gap-2 w-full lg:items-start lg:w-1/3">
            <h3 className="text-xl uppercase lg:text-2xl">
                {name} health %
            </h3>
            <div 
                ref={progressBarRef}
                onClick={handleClick} 
                className="relative container w-full h-6 cursor-pointer"
            >
                <div
                    className="h-full bg-status-complete rounded-lg transition-all"
                    style={{width: `${progress}%`}}
                ></div>
                <div className="absolute inset-0 flex justify-center items-center text-xl font-bold text-neutral-text">
                    {progress}%
                </div>
            </div>
        </div>
    );
}

HealthBar.propTypes = {
    dailyDiary: PropTypes.object.isRequired,
    setDailyDiary: PropTypes.func.isRequired,
    name: PropTypes.string,
    setShowButton: PropTypes.func.isRequired
}

export default HealthBar;