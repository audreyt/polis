// Copyright (C) 2012-present, The Authors. This program is free software: you can redistribute it and/or  modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

import StaticLayout from './lander-layout'
import { Heading, Box } from 'theme-ui'

const Donate = () => {
  return (
    <StaticLayout>
      <Box>
        <Heading as="h1" sx={{ my: [4, null, 5], fontSize: [6, null, 7] }}>
          Donate
        </Heading>
        <iframe
          src="https://donorbox.org/geo-polis"
          name="donorbox"
          scrolling="no"
          frameBorder="0"
          style={{
            width: '100%',
            minHeight: '955px',
            border: 'none',
            padding: 0,
            margin: 0
          }}
          title="Donorbox donation form"
        />
      </Box>
    </StaticLayout>
  )
}

export default Donate
