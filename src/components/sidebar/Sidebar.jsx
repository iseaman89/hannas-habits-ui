import React, {useContext, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from "../../hooks/useTheme.js";
import SwitchOff from "../../assets/icons/theme/switch-off.png";
import SwitchOn from "../../assets/icons/theme/switch-on.png";
import PowerIcon from "../../assets/icons/power.png"
import {AuthContext} from "../../context/AuthContext.jsx";

const Sidebar = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const {theme, toggleTheme} = useTheme();
    const { logout } = useContext(AuthContext);

    const navigateTo = (id, link) => {
        setActiveTab(id);
        id === 0 ? navigate(link, {state: {id: -1, date: new Date().toISOString()}}) : navigate(link);
        setIsOpen(false);
    };

    const tabs = [
        { id: 0, icon: '', text: 'Daily Diary', link: '/daily-diary' },
        { id: 1, icon: '', text: 'Habits Tracker', link: '/habit-tracker' },
        { id: 2, icon: '', text: 'Calendar', link: '/calendar' },
        { id: 3, icon: '', text: 'Resolutions', link: '/resolutions' },
    ];

    return (
        <div>
            <button
                className="xl:hidden p-2 m-2 text-2xl fixed md:text-4xl"
                onClick={() => setIsOpen(!isOpen)}
            >
                <p>
                    ☰
                </p>
            </button>
            <div
                className={`container w-1/2 h-[98%] m-2 p-4 bg-white fixed flex flex-col gap-4 items-center justify-center
                 left-0 top-0 z-40 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-[110%]"} lg:min-w-52 lg:w-1/6 xl:translate-x-0 2xl:w-1/12`}
            >
                <div className="absolute top-2">
                    <button
                        className="hover:cursor-pointer"
                        onClick={logout}
                    >
                        <img
                            src={PowerIcon}
                            alt=""
                            className="size-8 transition duration-300"
                        />
                    </button>
                </div>
                {tabs.map((tab, index) => (
                    <button
                        key={index}
                        onClick={() => navigateTo(tab.id, tab.link)}
                        className={"hover:cursor-pointer w-full transition-all hover:scale-110 " + (activeTab === index ? "button" : "container")}
                    >
                        <p>
                            {tab.text}
                        </p>
                    </button>
                ))}
                <div className="absolute bottom-0">
                    <button
                        className="hover:cursor-pointer"
                        onClick={toggleTheme}
                    >
                        <img
                            src={theme === 'light' ? SwitchOn : SwitchOff}
                            alt=""
                            className="size-10 transition duration-300"
                        />
                    </button>
                </div>
            </div>
            {isOpen && (
                <div
                    className="fixed top-0 left-1/2 w-full h-full bg-opacity-50 lg:left-1/6 xl:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default Sidebar;