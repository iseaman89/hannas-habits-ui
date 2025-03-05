import React from 'react';
import PropTypes from "prop-types";
import {useNavigate} from "react-router-dom";

const Month = ({color, monthIndex, month, year, dailyDiaryIds}) => {
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfMonth = (new Date(year, monthIndex, 1).getDay() === 0) ? 6 : new Date(year, monthIndex, 1).getDay() - 1;
    const navigate = useNavigate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }
    const emptyDays = Array(firstDayOfMonth).fill(null);

    const hasNeighbor = (index) => {
        const prevDay = days[index - 1];
        const nextDay = days[index + 1];
        return prevDay !== undefined || nextDay !== undefined;
    };
    
    const getDailyDiaryId = (day) => {
        return dailyDiaryIds.find(d => new Date(d.date).getDate() === day);
    }
    
    const getDate = (day) => {
        const formatedDate = new Date(year, monthIndex, day);
        return formatedDate.toISOString();
    }
    
    
    return (
        <div className="flex flex-col px-2 py-3 w-full h-full lg:py-6">
            <h3 
                className="font-title text-4xl 2xl:text-5xl" 
                style={{color: color}}
            >
                {month}
            </h3>
            <div 
                className="container grid grid-cols-7 p-2 mt-2 h-3/4 2xl:mt-8 2xl:h-2/3" 
                style={{boxShadow: '10px 8px 0 0 ' + color}}
            >
                {daysOfWeek.map((day, i) => (
                    <p 
                        key={i} 
                        className="text-black text-sm"
                    >
                        {day}
                    </p>
                ))}
                {emptyDays.map((_, index) => (
                    <div key={`empty-${index}`}></div>
                ))}
                {days.map((day, index) => (
                    <div
                        key={day}
                        onClick={() => navigate('/daily-diary', getDailyDiaryId(day) ? {state: {id: getDailyDiaryId(day).dailyDiaryId}} : {state: {id: -1, date: getDate(day)}})}
                        className={`flex px-1 border-1 border-black hover:cursor-pointer ${hasNeighbor(index) ? '' : 'rounded-xl'} ${getDailyDiaryId(day) ? 'bg-green-400' : ''}`}
                    >
                        <span className={`text-sm  ${[0, 6].includes(new Date(year, monthIndex, day).getDay()) ? 'text-highlight-1' : 'text-black dark:text-white'}`}>
                            {day}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

Month.propTypes = {
    color: PropTypes.string.isRequired,
    monthIndex: PropTypes.number.isRequired,
    month: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    dailyDiaryIds: PropTypes.array.isRequired,
}

export default Month;