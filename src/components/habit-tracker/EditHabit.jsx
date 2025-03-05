import React from 'react';
import Modal from 'react-modal';
import PropTypes from "prop-types";
import { ToastContainer, toast } from 'react-toastify';

const EditHabit = ({updateHabits, habit, isOpen, onClose}) => {
    const [open, setOpen] = React.useState(isOpen);
    const [title, setTitle] = React.useState(habit.title);
    const [priority, setPriority] = React.useState(habit.priority);
    const [schedules, setSchedules] = React.useState(habit.schedules);

    const daysOfWeek = [
        { id: 1, name: 'Monday' },
        { id: 2, name: 'Tuesday' },
        { id: 3, name: 'Wednesday' },
        { id: 4, name: 'Thursday' },
        { id: 5, name: 'Friday' },
        { id: 6, name: 'Saturday' },
        { id: 0, name: 'Sunday' },
    ];

    const handleSubmit =  () => {
        updateHabits({id: habit.id, title: title, priority: priority, schedules: schedules, completions: habit.completions, userId: habit.userId});
        onClose();
    }

    const isDaySelected = (dayId) => {
        return schedules.some(schedule => schedule === dayId);
    };

    const handleDayChange = (dayId) => {
        if (isDaySelected(dayId)) {
            setSchedules(schedules.filter((schedule) => schedule !== dayId));
        } else {
            setSchedules([...schedules, dayId]);
        }
    };

    const isAllDaysSelected = schedules.length === daysOfWeek.length;

    const handleAllDay = () => {
        if (isAllDaysSelected) {
            setSchedules([]);
        } else {
            setSchedules(daysOfWeek.map(day => day.id));
        }
    };

    return (
        <div className="z-50">
            <Modal
                isOpen={open}
                onRequestClose={onClose}
                contentLabel="Add Habit"
                className="container bg-white h-1/2 w-3/4  absolute top-1/2 left-1/2 translate-[-50%] md:w-1/2 xl:w-1/6"
            >
                <div className="p-8 flex flex-col items-center justify-between h-full">
                    <h1 className="text-2xl md:text-4xl">
                        Edit Habit
                    </h1>
                    <div className="w-full flex flex-col items-center justify-center">
                        <p className="text-2xl">
                            Title
                        </p>
                        <input
                            type="text"
                            onChange={(e) => setTitle(e.target.value)}
                            value={title}
                            className="focus:outline-0 text-2xl w-3/4 border-0 border-b-2"
                        />
                    </div>
                    <div className="w-full flex flex-col items-center justify-center">
                        <p className="text-2xl">
                            Days of week
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                            {daysOfWeek.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col"
                                >
                                    <p>
                                        {item.name}
                                    </p>
                                    <input
                                        type="checkbox"
                                        onChange={() => handleDayChange(item.id)}
                                        checked={isDaySelected(item.id)}
                                    />
                                </div>
                            ))}
                            <div className="flex flex-col">
                                <p>
                                    All days
                                </p>
                                <input
                                    type="checkbox"
                                    onChange={() => handleAllDay()}
                                    checked={isAllDaysSelected}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="">
                        <button
                            onClick={onClose}
                            className="mr-2 button px-8 py-1 text-xl hover:cursor-pointer md:text-2xl"
                        >
                            Cancel
                        </button>
                        <button
                            className="button px-8 py-1 text-xl hover:cursor-pointer md:text-2xl"
                            onClick={handleSubmit}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
            <ToastContainer
                position="top-right"
                autoClose={3000}
            />
        </div>
    );
};

EditHabit.propTypes = {
    updateHabits: PropTypes.func.isRequired,
    habit: PropTypes.object.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}

export default EditHabit;