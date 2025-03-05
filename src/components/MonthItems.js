import JanIcon from '../assets/icons/months/JanIcon.svg';
import JanText from '../assets/icons/months/January.svg';
import FebIcon from '../assets/icons/months/FebIcon.svg';
import FebText from '../assets/icons/months/February.svg';
import MarIcon from '../assets/icons/months/MarchIcon.svg';
import MarText from '../assets/icons/months/March.svg';
import AprIcon from '../assets/icons/months/AprilIcon.svg';
import AprText from '../assets/icons/months/April.svg';
import MayIcon from '../assets/icons/months/MayIcon.svg';
import MayText from '../assets/icons/months/May.svg';
import JunIcon from '../assets/icons/months/JuneIcon.svg';
import JunText from '../assets/icons/months/June.svg';
import JulIcon from '../assets/icons/months/JulyIcon.svg';
import JulText from '../assets/icons/months/July.svg';
import AugIcon from '../assets/icons/months/AugIcon.svg';
import AugText from '../assets/icons/months/August.svg';
import SepIcon from '../assets/icons/months/SepIcon.svg';
import SepText from '../assets/icons/months/September.svg';
import OctIcon from '../assets/icons/months/OctIcon.svg';
import OctText from '../assets/icons/months/October.svg';
import NovIcon from '../assets/icons/months/NovIcon.svg';
import NovText from '../assets/icons/months/November.svg';
import DecIcon from '../assets/icons/months/DecIcon.svg';
import DecText from '../assets/icons/months/December.svg';

export const monthItems = (year) => [
    { month: 'January', days: 31, color: '#80BEAF', icon: JanIcon, text: JanText },
    { month: 'February', days: year % 4 === 0 ? 29 : 28, color: '#FF879C', icon: FebIcon, text: FebText },
    { month: 'March', days: 31, color: '#FCAC89', icon: MarIcon, text: MarText },
    { month: 'April', days: 30, color: '#DEBBB9', icon: AprIcon, text: AprText },
    { month: 'May', days: 31, color: '#FAB057', icon: MayIcon, text: MayText },
    { month: 'June', days: 30, color: '#D9D9D9', icon: JunIcon, text: JunText },
    { month: 'July', days: 31, color: '#B97692', icon: JulIcon, text: JulText },
    { month: 'August', days: 31, color: '#5DA4FF', icon: AugIcon, text: AugText },
    { month: 'September', days: 30, color: '#FFE97F', icon: SepIcon, text: SepText },
    { month: 'October', days: 31, color: '#F1854F', icon: OctIcon, text: OctText },
    { month: 'November', days: 30, color: '#E5D2A8', icon: NovIcon, text: NovText },
    { month: 'December', days: 31, color: '#C4DD96', icon: DecIcon, text: DecText },
]