import React from 'react';
import { DataObject } from '../../../utils/NarrativeModel';
import Runtime from '../../../utils/runtime';
import { getWSTypeName } from '../../../utils/stringUtils';
import { TypeIcon } from '../../generic/Icon';

interface Props {
  accessGroup: number;
  dataObjects: Array<DataObject>;
}

export default function DataView(props: Props) {
  const { accessGroup } = props;
  const rows = props.dataObjects
    .slice(0, 50)
    .map((obj) => {
      obj.readableType = getWSTypeName(obj.obj_type);
      return obj;
    })
    .sort((a, b) => a.readableType.localeCompare(b.readableType))
    .map((obj) => dataViewRow(accessGroup, obj));
  if (rows.length === 0) {
    return (
      <p style={{ textAlign: 'center', fontStyle: 'italic', padding: '20px' }}>
        This Narrative has no data.
      </p>
    );
  }
  return <div className="pt3">{rows}</div>;

  // View for each row in the data listing for the narrative
  function dataViewRow(accessGroup: number, obj: DataObject) {
    const key = obj.name + obj.obj_type;
    return (
      <div key={key} className="flex flex-row flex-nowrap pv1 pl2">
        <div>
          <TypeIcon objType={obj.obj_type} />
        </div>
        <div className="ml4">
          <div className="dataview">
            <a
              href={`${
                Runtime.getConfig().host_root
              }/#dataview/${accessGroup}/${obj.name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {obj.name}
            </a>
          </div>
          <div className="black-80 f6 mt1">{obj.readableType}</div>
        </div>
      </div>
    );
  }
}
