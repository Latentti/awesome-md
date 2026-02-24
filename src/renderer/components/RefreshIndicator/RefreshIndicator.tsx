import styles from './RefreshIndicator.module.css';

interface RefreshIndicatorProps {
  isRefreshing: boolean;
}

export const RefreshIndicator = ({ isRefreshing }: RefreshIndicatorProps) => {
  if (!isRefreshing) return null;

  return <div className={styles.indicator} />;
};
