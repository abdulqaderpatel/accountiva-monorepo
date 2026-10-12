import { ref } from 'vue';

const isCollapsed = ref(localStorage.getItem('sidebar_collapsed') === 'true');
const scrollTop = ref(0);

export function useSidebar() {
  const toggleCollapsed = () => {
    isCollapsed.value = !isCollapsed.value;
    localStorage.setItem('sidebar_collapsed', String(isCollapsed.value));
  };

  const setCollapsed = (val: boolean) => {
    isCollapsed.value = val;
    localStorage.setItem('sidebar_collapsed', String(val));
  };

  return {
    isCollapsed,
    scrollTop,
    toggleCollapsed,
    setCollapsed,
  };
}
