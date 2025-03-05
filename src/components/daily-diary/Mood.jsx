import React from 'react';
import SuperIcon from '../../assets/icons/mood/super.svg';
import GoodIcon from '../../assets/icons/mood/good.svg';
import OkIcon from '../../assets/icons/mood/ok.svg';
import BadIcon from '../../assets/icons/mood/bad.svg';
import TerribleIcon from '../../assets/icons/mood/terriable.svg';
import HackIcon from '../../assets/icons/mood/hack.svg';
import HackDarkIcon from '../../assets/icons/mood/hack-dark.svg';
import { useTheme } from '../../hooks/useTheme.js'
import PropTypes from "prop-types";

const Mood = ({ dailyDiary, setDailyDiary, setShowButton }) => {
    const icons = [SuperIcon, GoodIcon, OkIcon, BadIcon, TerribleIcon];
    const { theme } = useTheme();
    const handleChangeMood = (newMood) => {
        setDailyDiary(prev => ({ ...prev, mood: newMood }));
        setShowButton(true);
    }

    return (
        <div className="flex flex-col gap-2 w-full lg:w-1/3">
            <h3 className="text-xl capitalize lg:text-2xl">
                My mood today
            </h3>
            <div className="flex justify-between">
                {icons.map((icon, index) => (
                    <div 
                        key={index} 
                        className="flex flex-col gap-2 transition-all duration-500"
                    >
                        <img 
                            src={icon}
                            alt="" 
                            onClick={() => handleChangeMood(index)} 
                            className="hover:cursor-pointer"
                        />
                        {dailyDiary.mood === index && (
                            <img 
                                src={theme === "light" ? HackIcon : HackDarkIcon}
                                alt="" 
                                className="transition duration-500"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

Mood.propTypes = {
    dailyDiary: PropTypes.object.isRequired,
    setDailyDiary: PropTypes.func.isRequired,
    setShowButton: PropTypes.func.isRequired,
};

export default Mood;