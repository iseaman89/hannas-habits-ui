import React, { useState } from "react";
import PropTypes from "prop-types";

function EditableText({ value, onChange, isResolution, placeholder = "Click here to type..." }) {
    const [text, setText] = useState(value || "");
    const textareaRef = React.useRef(null);
    
    React.useEffect(() => {
        setText(value);
    }, [value])

    const handleKeyDown = (event) => {
        if (event.key === "Enter") {
            onChange(text.trim() || null);
            setText(value || "");
        }
    };

    return (
        <div className={`w-full ${isResolution ? 'h-[24px]' : 'h-full'} cursor-text`}>
            <textarea
                ref={textareaRef}
                className="w-full h-full focus:outline-none border-none resize-none  bg-transparent overflow-y-auto whitespace-pre-wrap break-word"
                placeholder={placeholder}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
            />
        </div>
    );
}

EditableText.propTypes = {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    isResolution: PropTypes.bool.isRequired,
    placeholder: PropTypes.string,
};

export default EditableText;