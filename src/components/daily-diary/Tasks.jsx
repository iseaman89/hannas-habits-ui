import React from 'react';
import PropTypes from "prop-types";
import EditableList from "../EditableList.jsx";

function Tasks({dailyDiary, setDailyDiary, setShowButton}) {
    const handleChangeTasks = (tasks) => {
        setDailyDiary(prev => ({ ...prev, dailyTasks: tasks }));
        setShowButton(true);
    }
    
    return (
        <div className="h-1/3 gap-2 flex flex-col items-center mt-10 md:mt-0 lg:items-start">
            <h3 className="text-xl capitalize lg:text-2xl">
                Tasks i completed today
            </h3>
            <div className="container">
                <EditableList
                    onChange={handleChangeTasks} 
                    isCheckList={true}
                    initialItems={Array.isArray(dailyDiary?.dailyTasks) ? dailyDiary?.dailyTasks : []}
                />
            </div>
        </div>
    );
}

Tasks.propTypes = {
    dailyDiary: PropTypes.object.isRequired,
    setDailyDiary: PropTypes.func.isRequired,
    setShowButton: PropTypes.func.isRequired,
}

export default Tasks;