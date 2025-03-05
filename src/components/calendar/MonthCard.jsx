import React from 'react';
import PropTypes from "prop-types";
import Month from "./Month.jsx";

const MonthCard = ({index, month, year, color, icon, text, dailyDiaryIds}) => {
    const findDailyDiaryIdsForMonth = () => {
        return dailyDiaryIds.filter(d => new Date(d.date).getMonth() === index);
    }
    
    return (
        <div className="flip-card bg-transparent w-full h-full rounded-lg" >
            <div 
                className={"flip-card-inner relative w-full h-full text-center shadow-2xl "} 
                style={{backgroundColor: color}}
            >
                <div className="flip-card-front absolute w-full h-full flex flex-col items-center justify-center">
                    <img 
                        className="size-24"
                        src={icon}
                        alt=""
                    />
                    <img 
                        className="size-24"
                        src={text} 
                        alt=""
                    />
                </div>
                <div className="flip-card-back absolute w-full h-full">
                    <Month
                        month={month}
                        monthIndex={index}
                        color={color} 
                        year={year} 
                        dailyDiaryIds={findDailyDiaryIdsForMonth()}
                    />
                </div>
            </div>
        </div>
    );
};

MonthCard.propTypes = {
    index: PropTypes.number.isRequired,
    month: PropTypes.string.isRequired,
    year: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    dailyDiaryIds: PropTypes.array.isRequired,
}

export default MonthCard;