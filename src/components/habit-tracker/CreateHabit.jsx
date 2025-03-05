import React from 'react';
import Modal from 'react-modal';
import {createHabit} from "../../services/HabitService.js";
import PropTypes from "prop-types";
import AddIcon from '../../assets/icons/add.svg';
import SubtractImg from '/src/assets/img/Subtract.png';
import { ToastContainer, toast } from 'react-toastify';

const CreateHabit = ({addHabit}) => {
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState('');
    const [priority, setPriority] = React.useState(1);
    const [schedules, setSchedules] = React.useState([]);
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    const daysOfWeek = [
        { id: 1, name: 'Monday' },
        { id: 2, name: 'Tuesday' },
        { id: 3, name: 'Wednesday' },
        { id: 4, name: 'Thursday' },
        { id: 5, name: 'Friday' },
        { id: 6, name: 'Saturday' },
        { id: 0, name: 'Sunday' },
    ];

    const handleOpen = () => setOpen(!open);
    
    const handleSubmit = async () => {
        try {
            const data = await createHabit({title: title, schedules: schedules, userId: userId}, token);
            addHabit(data);
            toast.success('Created!', {
                className: 'container'
            });
            handleClose();
        }
        catch (error) {
            console.log(error);
            toast.error('Create failed!', {
                className: 'container'
            });
        }
    }
    
    const handleClose = () => {
        setTitle('');
        setSchedules([]);
        handleOpen();
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
        <div>
            <div 
                className="absolute -rotate-12 bg-no-repeat flex items-center justify-center bg-center bg-contain w-20 h-22"
                style={{backgroundImage: `url(${SubtractImg})`}}
            >
                <img
                    src={AddIcon}
                    onClick={handleOpen}
                    alt="Add"
                    className="size-16 hover:cursor-pointer hover:scale-105"
                />
            </div>
            <Modal
                isOpen={open}
                onRequestClose={handleClose}
                contentLabel="Add Habit"
                className="container bg-white h-1/2 w-3/4 absolute top-1/2 left-1/2 translate-[-50%] md:w-1/2 xl:w-1/6"
            >
                <div className="p-8 flex flex-col items-center justify-between h-full">
                    <h1 className="text-2xl md:text-4xl">
                        Add new Habit
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
                            onClick={handleClose}
                            className="mr-2 button px-8 py-1 text-xl hover:cursor-pointer md:text-2xl"
                        >
                            Cancel
                        </button>
                        <button 
                            className="button px-8 py-1 text-xl hover:cursor-pointer md:text-2xl" 
                            onClick={handleSubmit}
                        >
                            Add
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

CreateHabit.propTypes = {
    addHabit: PropTypes.func.isRequired,
}

export default CreateHabit;