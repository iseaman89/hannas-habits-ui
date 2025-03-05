import React from 'react';
import PropTypes from "prop-types";
import './checkbox.css';
import EditIcon from '../../assets/icons/edit.png';
import DeleteIcon from '../../assets/icons/delete.svg';
import EditHabit from "./EditHabit.jsx";
import DeleteHabit from "./DeleteHabit.jsx";

const HabitsTable = ({year, month, habits, updateHabits, setHabits}) => {
    const [editHabit, setEditHabit] = React.useState(null);
    const [deleteHabit, setDeleteHabit] = React.useState(null);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

    const handleToggle = (date, habit) => {
        const isCompleted = habit.completions?.some(c =>
            new Date(c.completionDate).toDateString() === date.toDateString()
        );

        const updatedCompletions = isCompleted
            ? habit.completions.filter(c =>
                new Date(c.completionDate).toDateString() !== date.toDateString()
            )
            : [...(habit.completions || []), {completionDate: date}];

        updateHabits({...habit, completions: updatedCompletions});
    };

    return (
        <div className="overflow-x-auto">
            <table className="table-auto mt-8 overflow-x-scroll">
                <thead>
                    <tr>
                        <th className="p-2 sticky left-0 z-40"></th>
                        {days.map((day, index) => (
                            <th 
                                key={index}
                                className="p-2 text-xl text-center border-l-1 border-neutral-dots w-10"
                            >
                                <p>
                                    {day}
                                </p>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                {habits.map((habit, habitIndex) => (
                    <tr key={habit.id || habitIndex}>
                        <td className="p-2 text-xl max-w-1/2 font-semibold border-t-1 border-neutral-dots sticky left-0 z-40">
                            <div className="flex justify-between group">
                                <p>
                                    {habit.title}
                                </p>
                                <div className="flex group-hover:opacity-100 transition-opacity duration-300 lg:opacity-0">
                                    <img 
                                        src={EditIcon}
                                        alt=""
                                        className="hover:cursor-pointer transition-all hover:scale-125"
                                        onClick={() => setEditHabit(habit)}
                                    />
                                    <img 
                                        src={DeleteIcon}
                                        alt=""
                                        className="size-8 hover:cursor-pointer transition-all hover:scale-125"
                                        onClick={() => setDeleteHabit(habit.id)}
                                    />
                                </div>
                            </div>
                        </td>
                        {days.map((day, index) => {
                            const date = new Date(year, month, day);
                            const dayOfWeek = date.getDay();
                            const isScheduled = habit.schedules?.includes(dayOfWeek);
                            const isCompleted = habit.completions?.some(c =>
                                new Date(c.completionDate).toDateString() === date.toDateString()
                            );

                            return (
                                <td
                                    key={index}
                                    className="text-center p-2 border-l-1 border-t-1 border-neutral-dots"
                                >
                                    {isScheduled ? (
                                        <input
                                            type="checkbox"
                                            checked={isCompleted}
                                            onChange={() => handleToggle(date, habit)}
                                            id={`habit-${habitIndex}-day-${day}`}
                                            className="habit-checkbox hover:cursor-pointer"
                                        />
                                    ) : (
                                        <span className="text-neutral-dots">
                                            -
                                        </span>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
                </tbody>
            </table>
            {editHabit && (
                <EditHabit
                    habit={editHabit}
                    updateHabits={updateHabits}
                    isOpen={true}
                    onClose={() => setEditHabit(null)}
                />
            )}
            {deleteHabit && (
                <DeleteHabit
                    setHabits={setHabits}
                    id={deleteHabit}
                    isOpen={true}
                    onClose={() => setDeleteHabit(null)}
                />
            )}
        </div>
    );
};

HabitsTable.propTypes = {
    year: PropTypes.number.isRequired,
    month: PropTypes.number.isRequired,
    habits: PropTypes.array.isRequired,
    updateHabits: PropTypes.func.isRequired,
    setHabits: PropTypes.func.isRequired,
};

export default HabitsTable;