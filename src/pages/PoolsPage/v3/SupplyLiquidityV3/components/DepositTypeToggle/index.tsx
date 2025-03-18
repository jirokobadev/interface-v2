import React, { useState } from 'react';
import Loader from 'components/Loader';
import { Box } from '@material-ui/core';
// import './index.scss';
import { useTranslation } from 'react-i18next';

interface IDepositType {
  handleSelectDepositType: (depositType: string) => void;
}

export function DepositTypeToggle({ handleSelectDepositType }: IDepositType) {
  const { t } = useTranslation();
  const [type, setType] = useState('manual');

  const selectType = (type: string) => {
    handleSelectDepositType(type);
    setType(type);
  };

  return (
    <Box className='version-toggle-container'>
      <Box
        className={type === 'manual' ? 'version-toggle-active' : ''}
        onClick={() => {
          selectType('manual');
        }}
      >
        <small style={{ lineHeight: 5.85, fontSize: '13px' }}>
          {t('manual')}
        </small>
      </Box>
      <Box
        className={type === 'zap' ? 'version-toggle-active' : ''}
        onClick={() => {
          selectType('zap');
        }}
      >
        <small style={{ lineHeight: 5.85, fontSize: '13px' }}>{t('zap')}</small>
      </Box>
    </Box>
  );
}
