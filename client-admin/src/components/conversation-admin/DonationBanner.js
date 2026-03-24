// Copyright (C) 2012-present, The Authors. This program is free software: you can redistribute it and/or  modify it under the terms of the GNU Affero General Public License, version 3, as published by the Free Software Foundation. This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details. You should have received a copy of the GNU Affero General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { useState } from 'react'
import { Box, Text, Link, Close } from 'theme-ui'

const DonationBanner = () => {
  const [visible, setVisible] = useState(true)

  if (!visible) {
    return null
  }

  return (
    <Box
      sx={{
        p: 3,
        mb: 4,
        backgroundColor: 'lightyellow',
        border: '1px solid',
        borderColor: 'orange',
        borderRadius: '4px',
        position: 'relative',
        paddingRight: '20px'
      }}>
      <Box sx={{ maxWidth: '900px', margin: '0 auto' }}>
        <Close
          onClick={() => setVisible(false)}
          sx={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            cursor: 'pointer'
          }}
        />
        <Text sx={{ fontSize: 2, fontWeight: 'bold', mb: 2, display: 'block' }}>
          Pol.is is more than a platform; it&apos;s a new public square.
        </Text>
        <Text sx={{ fontSize: 1, mb: 2 }}>
          From local communities to national debates, Pol.is helps bridge divides and build
          consensus. It&apos;s a quiet revolution in public discourse. To protect this vital space
          for democracy and expand its impact, we rely on support from users like you.
        </Text>
        <br />
        <Link
          href="https://pol.is/donate"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontSize: 2, fontWeight: 'bold', display: 'inline-block' }}>
          Please consider a donation to secure the future of Pol.is.
        </Link>
      </Box>
    </Box>
  )
}

export default DonationBanner
