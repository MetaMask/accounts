import React from 'react';

export const JSONViewer = ({ data }: any) => {
  const renderNode = (key: string, value: unknown) => {
    if (typeof value === 'object') {
      return <JSONViewer data={value} />;
    }
    return (
      <div>
        <span>{key}: </span>
        <span>{value as string}</span>
      </div>
    );
  };

  const renderJSON = () => {
    if (typeof data !== 'object') {
      return <span>{data as string}</span>;
    }
    return Object.entries(data).map(([key, value]) => (
      <div key={key}>{renderNode(key, value)}</div>
    ));
  };

  return <div>{renderJSON()}</div>;
};
