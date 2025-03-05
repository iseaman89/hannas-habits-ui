import React from 'react';
import {deleteHabit} from "../../services/HabitService.js";
import PropTypes from "prop-types";
import Modal from "react-modal";
import { ToastContainer, toast } from 'react-toastify';

const DeleteHabit = ({setHabits, id, isOpen, onClose}) => {
    const [open, setOpen] = React.useState(isOpen);
    const token = localStorage.getItem('token');
    
    const handleDeleteHabit = async () => {
        try {
            await deleteHabit(id, token);
            setHabits(prevHabits => prevHabits.filter(habit => habit.id !== id));
            toast.success('Deleted!', {
                className: 'container'
            });
            onClose();
        } catch (error) {
            console.log(error);
            toast.error('Delete failed!', {
                className: 'container'
            });
        }
    }
    
    return (
        <div>
            <Modal
                isOpen={open}
                onRequestClose={onClose}
                contentLabel="Add Habit"
                className="container flex flex-col items-center justify-center bg-white h-[10%] w-3/4  absolute top-1/2 left-1/2 translate-[-50%] md:w-1/2 xl:w-1/6"
            >
                <h3 className="text-xl md:text-2xl">
                    Are you sure?
                </h3>
                <div className="flex items-center justify-center">
                    <button
                        onClick={onClose}
                        className="mr-2 button px-8 py-1 text-l hover:cursor-pointer md:text-xl"
                    >
                        Cancel
                    </button>
                    <button
                        className="button px-8 py-1 text-l hover:cursor-pointer md:text-xl"
                        onClick={handleDeleteHabit}
                    >
                        Delete
                    </button>
                </div>
            </Modal>
            <ToastContainer
                position="top-right"
                autoClose={3000}
            />
        </div>
    );
};

DeleteHabit.propTypes = {
    setHabits: PropTypes.func.isRequired,
    id: PropTypes.number.isRequired,
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
}

export default DeleteHabit;