import React, { useState, useEffect } from "react";
import '../components/daily-diary/checkboxs.css'
import PropTypes from "prop-types";
import isEqual from "lodash/isEqual";

const EditableList = ({ initialItems = [], onChange, isCheckList }) => {
    const maxItems = isCheckList ? 16 : 7;
    const emptyItems = Array(maxItems).fill(isCheckList ? { title: "", isCompleted: false } : "");
    const [items, setItems] = useState([...initialItems, ...emptyItems].slice(0, maxItems));

    useEffect(() => {
        if (!Array.isArray(initialItems)) return;
        if (!isEqual(items.slice(0, initialItems.length), initialItems)) {
            setItems([...initialItems, ...emptyItems].slice(0, maxItems));
        }
        
    }, [initialItems]);

    const handleChange = (index, value) => {
        const newItems = [...items];
        newItems[index] = isCheckList ? { ...newItems[index],  title: value } : value;
        setItems(newItems);
        const filteredItems = newItems.filter(item => isCheckList ? item.title.trim() !== "" : item.trim() !== "");
        onChange(filteredItems);
    };

    const handleCheck = (index) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], isCompleted: !newItems[index].isCompleted };
        setItems(newItems);
        const filteredItems = newItems.filter(item => item.title.trim() !== "");
        onChange(filteredItems);
    };

    const firstEmptyIndex = items.findIndex(item => isCheckList ? item.title === "" : item === "");

    return (
        <div className="p-7">
            <ul className={" " + (isCheckList ? "space-y-4" : "space-y-3 pl-5 list-disc dark:text-white")}>
                {items.map((item, index) => (
                    <li 
                        key={index} 
                        className={isCheckList ? "flex justify-between" : "relative"}
                    >
                        {isCheckList && (
                            <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={() => handleCheck(index)}
                                className="cursor-pointer size-4 task-checkbox"
                            />
                        )}
                        <input
                            type="text"
                            className="w-11/12 border-b border-gray-300 focus:outline-none overflow-x-scroll transition"
                            value={isCheckList ? item.title : item}
                            onChange={(e) => handleChange(index, e.target.value)}
                            placeholder={index === firstEmptyIndex ? "Click here to type..." : ""}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
};

EditableList.propTypes = {
    initialItems: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    isCheckList: PropTypes.bool.isRequired,
};

export default EditableList;
