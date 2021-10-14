/**
 * @jest-environment jsdom
 */

import React from 'react';
import { shallow } from 'enzyme';

import ControlMenu from '../ControlMenu';
import { Doc } from '../../../../../utils/NarrativeModel';

describe('Preview tests', () => {
  it('<ControlMenu> should render', () => {
    const narrative: Doc = {
      access_group: 1,
      cells: [],
      copied: null,
      creation_date: '',
      creator: '',
      data_objects: [],
      is_narratorial: false,
      is_public: false,
      is_temporary: false,
      modified_at: 0,
      narrative_title: '',
      obj_id: 0,
      obj_name: '',
      obj_type_module: '',
      obj_type_version: '',
      owner: '',
      shared_users: [],
      tags: [],
      timestamp: 0,
      total_cells: 0,
      version: 0,
    };
    const props = {
      narrative,
      cancelFn: () => {},
      doneFn: () => {},
    };
    expect(shallow(<ControlMenu {...props} />)).toBeTruthy();
  });
});
