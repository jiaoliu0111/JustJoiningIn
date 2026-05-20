const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatHomeClock(date = new Date()) {
  return {
    currentDate: `${pad(date.getMonth() + 1)}月${pad(date.getDate())}日`,
    currentWeekday: weekdays[date.getDay()],
    currentTime: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

module.exports = {
  formatHomeClock
};
