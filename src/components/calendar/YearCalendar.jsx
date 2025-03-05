import React from 'react';
import PropTypes from "prop-types";
import MonthCard from "./MonthCard.jsx";
import {monthItems} from "../MonthItems.js";

const YearCalendar = ({year, dailyDiaryIds}) => {
    const months = monthItems(year);
    
    return (
        <div className="flex flex-col items-center justify-center w-screen h-[400vh] p-8 md:h-[300vh] xl:h-screen">
            <h1 className="text-5xl font-title lg:text-7xl">
                Calendar {year}
            </h1>
            <div className="grid-cols-1 grid gap-1.5 w-4/5 h-full mt-8 lg:w-1/2 md:grid-cols-2 xl:grid-cols-4">
                {months.map((month, index) => (
                    <MonthCard 
                        key={index} 
                        index={index}
                        month={month.month}
                        year={year}
                        color={month.color} 
                        icon={month.icon} 
                        text={month.text} 
                        dailyDiaryIds={dailyDiaryIds}/>
                ))}
            </div>
        </div>
    );
};

YearCalendar.propTypes = {
    year: PropTypes.number.isRequired,
    dailyDiaryIds: PropTypes.array.isRequired,
}

export default YearCalendar;