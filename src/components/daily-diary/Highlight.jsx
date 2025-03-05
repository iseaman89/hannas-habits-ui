import React from 'react';
import PropTypes from "prop-types";
import EditableText from "../EditableText.jsx";

const Highlight = ({dailyDiary, setDailyDiary, setShowButton}) => {
    const handleChangeHighlight = (text) => {
        setDailyDiary(prev => ({ ...prev, highlight: text }));
        setShowButton(true);
    }
    
    return (
        <div className="flex flex-col items-center gap-2 h-full lg:items-start lg:h-1/3">
            <h3 className="text-xl capitalize lg:text-2xl">
                Highlights of the day
            </h3>
            <div className="container p-7 h-100 text-xl lg:">
                <div 
                    className="h-full"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='25'%3E%3Cline x1='0' y1='24' x2='100%25' y2='24' stroke='%23bbb' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: "100% 25px"
                    }} 
                >
                    <EditableText 
                        onChange={(text) => handleChangeHighlight(text)} 
                        value={dailyDiary.highlight} 
                        isResolution={false}
                    />
                </div>
            </div>
        </div>
    );
};

Highlight.propTypes = {
    dailyDiary: PropTypes.object.isRequired,
    setDailyDiary: PropTypes.func.isRequired,
    setShowButton: PropTypes.func.isRequired,
}

export default Highlight;