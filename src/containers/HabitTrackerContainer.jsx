import React from 'react';
import {getHabits, updateHabit} from "../services/HabitService.js";
import HabitsTable from "../components/habit-tracker/HabitsTable.jsx";
import CreateHabit from "../components/habit-tracker/CreateHabit.jsx";
import ArrowRightIcon from "../assets/icons/arrow-right.png";
import ArrowLeftIcon from "../assets/icons/arrow-left.png";
import {monthItems} from "../components/MonthItems.js";

const HabitTrackerContainer = () => {
    const [habits, setHabits] = React.useState([]);
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
    const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth());
    const months = monthItems(currentYear);
    
    React.useEffect(() => {
        fetchData();
    }, [userId, token]);

    const fetchData = async () => {
        try {
            const data = await getHabits(userId, token);
            setHabits(data);
        } catch (error) {
            console.log(error);
        }
    }
    
    const updateHabits = async () => {
        for (const habit of habits) {
            try {
                await updateHabit(habit.id, habit, token);
            } catch (error) {
                console.log(error);
            }
        }
        fetchData();
    }

    const handleAddHabit = (habit) => {
        setHabits(prevState => [...prevState, habit]);
    };

    const handleUpdateHabits = (updatedHabit) => {
        setHabits(prevHabits =>
            prevHabits.map(habit =>
                habit.id === updatedHabit.id ? updatedHabit : habit
            )
        );
        console.log(habits)
    };
    
    const handleForward = () => {
        if (currentMonth >= 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    }

    const handleBackward = () => {
        if (currentMonth <= 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    }
    
    return (
        <div className="flex flex-col h-screen w-screen gap-4 p-8 lg:items-center">
            <h1 className="text-5xl font-title text-center lg:text-7xl">
                Habits Tracker
            </h1>
            <div className="flex w-full items-center justify-between lg:w-1/4">
                <img 
                    src={ArrowLeftIcon} 
                    alt=""
                    onClick={handleBackward}
                    className="hover:cursor-pointer transition-all hover:scale-125"
                />
                <div className="flex items-center">
                    <img 
                        src={months[currentMonth].text} 
                        alt=""
                        className="w-20 h-10 lg:h-14 lg:w-[10rem]"
                    />
                    <h1 className="text-3xl text-center lg:text-4xl">
                        {currentYear}
                    </h1>
                </div>
                <img
                    src={ArrowRightIcon} 
                    alt=""
                    onClick={handleForward}
                    className="hover:cursor-pointer transition-all hover:scale-125"
                />
            </div>
            <div className="flex flex-col lg:items-end">
                <HabitsTable 
                    habits={habits}
                    month={currentMonth}
                    year={currentYear} 
                    updateHabits={handleUpdateHabits}
                    setHabits={setHabits}
                />
                <CreateHabit addHabit={handleAddHabit}/>
            </div>
            <button 
                type="submit"
                onClick={updateHabits}
                className={"fixed right-5 bg-white hover:cursor-pointer bottom-5 button px-8 py-1 text-2xl lg:absolute lg:right-20 lg:bottom-10"}
            >
                Save
            </button>
        </div>
    );
};

export default HabitTrackerContainer;