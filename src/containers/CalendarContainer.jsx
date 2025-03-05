import React, {useState} from 'react';
import {getDailyDiaryIds} from "../services/DailyDiaryService.js";
import YearCalendar from "../components/calendar/YearCalendar.jsx";

const CalendarContainer = () => {
    const [dailyDiaryIds, setDailyDiaryIds] = React.useState([]);
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    
    React.useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getDailyDiaryIds(userId, token);
                setDailyDiaryIds(data);
            } catch (error) {
                console.log(error);
            }
        }
        
        fetchData();
    }, [userId, token]);
    
    return (
        <div>
            <YearCalendar 
                year={year} 
                dailyDiaryIds={dailyDiaryIds}
            />
        </div>
    );
};

export default CalendarContainer;