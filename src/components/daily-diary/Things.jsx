import React from 'react';
import PropTypes from "prop-types";
import EditableList from "../EditableList.jsx";

function Things({dailyDiary, setDailyDiary, isLearned, setShowButton}) {
    const handleChangeText = (text) => {
        setDailyDiary(prev => ({ ...prev, [isLearned ? 'learnedThings' : 'gratefulThings']: text }));
        setShowButton(true);
    }
    
    return (
        <div className="flex flex-col w-full items-center lg:items-start lg:w-1/2">
            <h3 className="text-xl capitalize lg:text-2xl">
                {isLearned ? 'new thing i learnt today' : 'i am grateful for'}
            </h3>
            <div className="container ">
                <div className="h-full">
                    <EditableList
                        onChange={handleChangeText}
                        initialItems={isLearned ? (Array.isArray(dailyDiary?.learnedThings) ? dailyDiary?.learnedThings : []) : (Array.isArray(dailyDiary?.gratefulThings) ? dailyDiary?.gratefulThings : [])} 
                        isCheckList={false}
                    />
                </div>
            </div>
        </div>
    );
}

Things.propTypes = {
    dailyDiary: PropTypes.object.isRequired,
    setDailyDiary: PropTypes.func.isRequired,
    isLearned: PropTypes.bool.isRequired,
    setShowButton: PropTypes.func.isRequired,
}

export default Things;